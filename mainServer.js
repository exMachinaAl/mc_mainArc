const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const http = require("http");
const bodyParser = require("body-parser");
const { Server } = require("socket.io");
const WebSocket = require('ws');
const net = require('net');
const EventEmitter = require("events");


process.setMaxListeners(15);

//el_L,R,E
// const authCR = require("./accountController/authentication");

// Setup express app
const app = express();
const PORT = 3002;

// ini adalaah side server untuk viewer Bot
const sideApp = express()
const SPort = 3004;

const serverV = http.createServer(sideApp)
// const ios = new Server(serverV, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// })
const ios = require('socket.io')(serverV, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
sideApp.use(express.json())

// sideApp.use(
//   "/:clientId/:botName/viewer/",
//   createProxyMiddleware({
//     target: "http://localhost:3010",
//     changeOrigin: true,
//     ws: true, // Pastikan WebSocket diteruskan
//     onProxyReq: (proxyReq, req, res) => {
//       console.log(`[PROXY] Forwarding request: ${req.url} -> ${proxyReq.path}`);
//     },
//     onProxyRes: (proxyRes, req, res) => {
//       console.log(`[PROXY] Response: ${proxyRes.statusCode}`);
//     },
//     onError: (err, req, res) => {
//       console.error(`[PROXY ERROR] ${err.message}`);
//       res.status(500).send("Proxy error");
//     }
//   })
// );



const activeBots = {}; // { clientID: { botName: port } }
// Fungsi untuk mendapatkan port berdasarkan clientID & botName
function getBotPort(clientID, botName) {
  return activeBots[clientID]?.[botName] || null;
}

// register bot viewer
sideApp.post("/register-bot", (req, res) => {
  console.log(req.body)
  const { clientID, botName, port, viewer } = req.body;

  if (!activeBots[clientID]) {
    activeBots[clientID] = {};
  }
  activeBots[clientID][botName] = { viewer: viewer, port: port };

  res.json({ message: "Bot berhasil didaftarkan.", clientID, botName, port, viewer });
});


sideApp.use( // ini adalah yang berjalan paling baik meski ada beberapa warning
  "/:clientId/:botName/viewer/socket.io/", (req, res, next) => {
    const { clientId, botName } = req.params;
    const dataViewer = activeBots;

    if (!dataViewer[clientId]) return res.json({message: `clientId tidak terdaftar atau nggak ada`});

    if (!dataViewer[clientId][botName]) return res.json({message: `botTidak terdaftar atau tidak ada`});

    const portBotOrigin = dataViewer[clientId][botName]?.port;
    return createProxyMiddleware({
      target: `http://localhost:${portBotOrigin}`,
      ws: true, // Pastikan WebSocket diteruskan
      changeOrigin: true,
      logLevel: "debug", // Tambahkan log untuk melihat lalu lintas proxy
      onProxyReq: (proxyReq, req, res) => {
        console.log(`[PROXY] Request ke bot: ${req.url}`);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(`[PROXY] Response dari bot: ${proxyRes.statusCode}`);
      },
      onError: (err, req, res) => {
        console.error(`[PROXY ERROR] ${err.message}`);
        res.status(500).send("Proxy error");
      }
    })(req, res, next)
  });


// 🔥 Tangani WebSocket secara eksplisit
serverV.on("upgrade", (req, socket, head) => {
  // if (req.url.includes("/socket.io/")) {
  //   console.log("[PROXY] WebSocket upgrade:", req.url);
  // }
  console.log(`[UPGRADE] WebSocket upgrade untuk ${req.url}`);
});

// const botProxy = createProxyMiddleware({
//   target: 'http://localhost:3010',
//   ws: true, // Pastikan WebSocket diaktifkan
//   changeOrigin: true,
//   pathRewrite: (path, req) => {
//     return path.replace(`/${req.params.clientId}/${req.params.botName}/viewer`, '');
//   },
//   onProxyReq: (proxyReq, req, res) => {
//     console.log(`[PROXY] Forwarding request: ${req.url} -> ${proxyReq.path}`);
//   },
//   onProxyRes: (proxyRes, req, res) => {
//     console.log(`[PROXY] Response from target: ${proxyRes.statusCode}`);
//   },
//   onError: (err, req, res) => {
//     console.error(`[PROXY ERROR] ${err.message}`);
//     res.status(500).send('Proxy error');
//   }
// });


// Middleware untuk menangani WebSocket secara eksplisit
// sideApp.use('/:clientId/:botName/viewer/', express.static(__dirname + 'node_modules/prismarine-viewer/public'));
// sideApp.use('/:clientId/:botName/viewer/', botProxy);

// sideApp.use(
//   '/:clientId/:botName/viewer/',
//   createProxyMiddleware({
//     target: 'http://localhost:3010',
//     changeOrigin: true,
//     ws: true,
//     pathRewrite: (path, req) => {
//       return path.replace(`/${req.params.clientId}/${req.params.botName}/viewer`, '');
//     }
//   })
// );

// ios.on("connection", (socket) => {
//   console.log(`[BOT] WebSocket terhubung: ${socket.id}`);
// });

// **Tambahkan WebSocket ke server**
// serverV.on('upgrade', (req, socket, head) => {
//   console.log(`[UPGRADE] WebSocket upgrade untuk ${req.url}`);
// })

// // Middleware untuk file statis dari Prismarine-Viewer
// sideApp.use("/viewer-static", express.static(path.join(__dirname, "node_modules/prismarine-viewer/public")));

// // Proxy untuk menyajikan viewer dengan path yang sesuai
// sideApp.use("/:clientId/:botName/viewer", express.static(path.join(__dirname, "node_modules/prismarine-viewer/public")));

// // Proxy untuk file statis viewer dari bot
// sideApp.use("/:clientId/:botName/viewer-static", createProxyMiddleware({
//   target: "http://localhost:3010", // Sesuaikan dengan server bot
//   changeOrigin: true,
//   ws: true,
//   pathRewrite: (path, req) => {
//     return path.replace(`/${req.params.clientId}/${req.params.botName}/viewer-static`, "/viewer-static");
//   }
// }));

// // Proxy untuk menangani socket.io
// sideApp.use(
//   "/socket.io",
//   createProxyMiddleware({
//     target: "http://localhost:3010", // Server bot
//     ws: true, // Aktifkan WebSocket
//     changeOrigin: true,
//     logLevel: "debug"
//   })
// );

// // Proxy untuk menangani polling socket.io
// sideApp.use(
//   "/:clientId/:botName/socket.io",
//   createProxyMiddleware({
//     target: "http://localhost:3010", // Server bot
//     ws: true, // Aktifkan WebSocket
//     changeOrigin: true,
//     logLevel: "debug",
//     pathRewrite: { "^/[^/]+/[^/]+/socket.io": "/socket.io" }
//   })
// )

// sideApp.use(
//   '/:clientId/:botName/viewer/socket.io/',
//   createProxyMiddleware({
//     target: 'http://localhost:3010',  // Arahkan ke bot asli
//     ws: true,  // Aktifkan WebSocket
//     changeOrigin: true,
//     pathRewrite: (path, req) => {
//       return path.replace(`/${req.params.clientId}/${req.params.botName}/viewer`, ''); // Hapus prefix proxy
//     },
//     onProxyReq: (proxyReq, req, res) => {
//       console.log(`[PROXY] Forwarding socket.io request: ${req.url} -> ${proxyReq.path}`);
//     }
//   })
// );

// sideApp._router.stack.forEach((middleware) => {
//   if (middleware.route) {
//       console.log(`Route: ${middleware.route.path}`);
//       console.log("Methods:", Object.keys(middleware.route.methods));
//   }
// });

serverV.listen(SPort, () => {
  console.log(`Server running on http://localhost:${SPort}`);
});
// ### pembatas side app

// Middleware
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});



// app.use(bodyParser.send());
app.use(express.urlencoded({ extended: true }));


// app.use("/:clientID/:botName/viewer", createProxyMiddleware({
//   target: "http://localhost:3010", // Port asli Prismarine-Viewer
//   changeOrigin: true,
//   ws: true, // Support WebSocket
//   pathRewrite: (path, req) => {
//     return path.replace(/^\/\d+\/[\w-]+\/viewer/, ""); 
//   }
// }));

// const activeBots = {}; // { clientID: { botName: port } }
// // Fungsi untuk mendapatkan port berdasarkan clientID & botName
// function getBotPort(clientID, botName) {
//   return activeBots[clientID]?.[botName] || null;
// }

// // register bot viewer
// app.post("/register-bot", (req, res) => {
//   const { clientID, botName, port } = req.body;

//   if (!activeBots[clientID]) {
//     activeBots[clientID] = {};
//   }
//   activeBots[clientID][botName] = port;

//   res.json({ message: "Bot berhasil didaftarkan.", clientID, botName, port });
// });

// // Middleware proxy untuk viewer
// app.use("/:clientID/:botName/viewer", (req, res, next) => {
//     const { clientID, botName } = req.params;
//     const botPort = getBotPort(clientID, botName);

//     if (!botPort) {
//         return res.status(404).send("Bot tidak ditemukan atau belum terdaftar");
//     }

//     console.log(`Proxying Viewer: ${req.originalUrl} -> http://localhost:${botPort}/`);

//   return createProxyMiddleware({
//     target: "http://localhost:3010", // Port default Prismarine-Viewer
//     changeOrigin: true,
//     ws: true, // WebSocket support
//     pathRewrite: (path, req) => {
//       console.log("Original Path:", path);
//       const newPath = path.replace(/^\/\d+\/[\w-]+\/viewer/, "");
//       console.log("Rewritten Path:", newPath);
//       return newPath || "/";
//     },
//     onProxyReq: (proxyReq, req, res) => {
//       console.log("Proxying request:", req.url);
//     },
//     onProxyRes: (proxyRes, req, res) => {
//       console.log("Received response:", proxyRes.statusCode, req.url);
//     },
//   })(req, res, next);
// });

// // Middleware untuk WebSocket
// app.use(
//   "/socket.io/",
//   createProxyMiddleware({
//     target: "http://localhost:3010",
//     changeOrigin: true,
//     ws: true, // Support WebSocket
//   })
// );

// // Middleware untuk file statis
// app.use("/:clientID/:botName/viewer", express.static(__dirname + "/public"));

// api http request response
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/userImage");
  },
  filename: (req, file, cb) => {
    const userID = req.headers["userid"]; // Ambil dari headers (frontend harus mengirim userID di headers)
    const uniqueName = `${userID || "unknown"}-user-vip.png`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

app.post("/upload/userProfile", upload.single("image"), (req, res) => {
  console.log("📩 Req Body:", req.body); // Debug req.body
  console.log("📷 Req File:", req.file); // Debug req.file

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  res.json({
    message: "Upload successful",
    imageUrl: `http://localhost:3002/uploads/userImage/${req.file.filename}`,
    userID: req.headers["userid"] || "unknown",
  });
});

// API untuk mengambil gambar
app.use("/uploads", express.static("uploads"));

// api socket controller <Server>
const clients = {};
const dataAddress = {}; // hapus dan uncomment jika pepindahan error
const sharedStates = {}; // { userId: { state } }
const defaultSharedState = {
  aiNames: {
    health: 0,
    hunger: 0,
    customData: "",
    message: {
      type: "",
      data: "",
    },
  },
};
const clientsPerUser = {}; // { userId: [socketId1, socketId2] }

let Specific_clientReady = false;
let Specific_clientReadyTO = false;

io.on("connection", (socket) => {
  // console.log("my id : ", socket.id);
  // const dataAddress = {}; // yang dimaksud

  socket.on("userDataDetailed", (dataUser) => {
    console.log(dataUser);
    // setTimeout(() => {
    //   /* tolong perbaiki metode nya agar lebih dynamic bukan memakai setTImeout */
    //   const DashboardClient = clients["anonymCl2"];
    //   if (DashboardClient) {
    //     console.log("Emitting data to specific client:", DashboardClient);
    //     io.to(DashboardClient).emit("userDataDetailedFrServerMn", dataUser);
    //   } else {
    //     console.log("Dashboard Client not found, cannot emit data.");
    //   }
    // }, 5000);
  });

  // segera merubah metode userId ke global id dari setiap user UID, jangan dari server
  socket.on("register", (userId) => {
    // wajib register terlebih dahulu client nya baru bisa pakaai client2client
    // Map userId ke socket.id
    clients[userId] = socket.id; // buatkan metode agar ada filtrasi jika bot sudah registrasi di akun yang sama atau socket yang sama dalam artian ada 2 ~ 3 filter
    // console.log("your id socket: ", socket.id)
    console.log(`User ${userId} registered with socket ID: ${socket.id}`);

    // metode milik synchornitation state
    if (!sharedStates[userId]) {
      sharedStates[userId] = defaultSharedState; // Contoh default state
    }
    // Tambahkan socket.id ke daftar klien untuk userId
    if (!clientsPerUser[userId]) {
      clientsPerUser[userId] = [];
    }
    clientsPerUser[userId].push(socket.id);

    // console.log(`User ${userId} connected with socket ID: ${socket.id}`);

    // Kirim state terkini ke klien
    // socket.emit("stateUpdate", sharedStates[userId]);
  });
  socket.on("updateState", ({ userId, newState }) => {
    // Update shared state untuk userId
    sharedStates[userId] = {
      ...sharedStates[userId],
      ...newState, // Gabungkan dengan state lama
    };

    // console.log(`State for user ${userId} updated:`, sharedStates[userId]);

    // Broadcast state terbaru ke semua klien di userId
    const sockets = clientsPerUser[userId] || [];
    sockets.forEach((socketId) => {
      io.to(socketId).emit("stateUpdate", sharedStates[userId]);
    });
  });
  socket.on("dataClient2Client", ({ toUserId, data }) => {
    // control utama socket client to client
    const targetSocketId = clients[toUserId];
    // console.log(clients[toUserId])
    // console.log(toUserId)
    // console.log(targetSocketId)
    if (targetSocketId === clients["mcAi1"]) {
      // socket id (mcAi1)
      // console.log("mengirim data objek ke botLogic server");
      // console.log("data objek dataJS: ", data);
      if (data["event"] === "createBot") {
        data["cmd"].idSocketAsClientId = targetSocketId;
        io.to(targetSocketId).emit("createBot", data["cmd"]);
      }
      if (data["event"] === "botOpenViewer") {
        data["cmd"].idSocketAsClientId = socket.id;
        io.to(targetSocketId).emit("botOpenViewer", data["cmd"]);
      }
      if (data["event"] === "debug_mode") {
        data["cmd"].idSocketAsClientId = socket.id;
        io.to(targetSocketId).emit("debug_mode", data["cmd"]);
      }

    } else if (targetSocketId) {
      // console.log("not targeted event: nothing, its normal.");
    } else {
      console.log("error: Target user not connected. ");
    }

    if (targetSocketId === clients["mcCl2"]) {
      // #@ tolong segera di perbaiki untuk spesifik client berdasarkan socketid dan client id => db
      // socket id (mcCl2)

      if (data["event"] === "createBotReturn") {
        io.to(targetSocketId).emit("botStatsSUID", data["status"]);
      }
    } else if (targetSocketId) {
      // console.log("not targeted event: nothing, its normal."); // ya mending no output
    } else {
      console.log("error: Target user not connected. ");
    }
  });
  socket.on("sendDataToSpecificSession", ({ targetSocketId, data }) => {
    console.log(`mengirimkan data dari ${socket.id} ke ${targetSocketId}`)
    io.to(targetSocketId).emit("spesificReceiveData", data);
  });

  socket.once("clientWebControl", (statusServer) => {
    console.log("clientWeb-controller: ", statusServer);
    dataAddress[socket.id] = {
      id: socket.id,
      event: "clientWebControl",
      data: statusServer,
    };
  });
  socket.once("loginServerAcc", (statusServer) => {
    console.log("login-controller: ", statusServer);
    dataAddress[socket.id] = {
      id: socket.id,
      event: "loginServerAcc",
      data: statusServer,
    };
  });
  socket.on("disconnect", () => {
    if (dataAddress[socket.id]?.event === "loginServerAcc") {
      console.log("login-controller: ", "closed");
    } else if (dataAddress[socket.id]?.event === "clientWebControl") {
      console.log("clientWebControl: ", "closed");
    }

    for (const [userId, id] of Object.entries(clients)) {
      // penanganan untuk client2Client
      if (id === socket.id) {
        delete clients[userId];
        console.log(`User ${userId} disconnected with socket ID: ${socket.id}`);
        break;
      }
    }

    for (const userId in clientsPerUser) {
      // penanganan disconnect untuk state synchronitation
      clientsPerUser[userId] = clientsPerUser[userId].filter(
        (id) => id !== socket.id
      );

      // Jika tidak ada klien tersisa untuk userId, hapus entry (opsional)
      if (clientsPerUser[userId].length === 0) {
        delete clientsPerUser[userId];
        console.log(`All clients for user ${userId} disconnected.`);
      }
    }
    // console.log("the id : ", socket.id, " disconnect");
  });

  // console.log(socket.eventNames()); // Menampilkan daftar event yang aktif
  // console.log(socket.listenerCount("register")); // Jumlah listener pada event tertentu

  // console.log("Event yang terdaftar:", socket.eventNames());

});

// Start the server
function checkerAllServer(type) {}

// console.log(EventEmitter.defaultMaxListeners); // Cek batas default listener
// console.log(io.listenerCount("connection")); // Cek listener pada event "connection"
// console.log(sideApp.listenerCount("request")); // Cek listener Express utama
// console.log(app.listenerCount("request")); // Cek listener Express utama
// io.sockets.sockets.forEach((socket) => {
//   console.log(`Socket ID: ${socket.id}`);
//   console.log("Event yang aktif:", socket.eventNames());
// });


server.listen(PORT, () => {
  let flags = "=====================================\n";
  flags += "== C2025 Minecraft_Arcedia Main_CT ==\n";
  flags += "=====================================";
  console.log(flags);
  console.log(`main Server running on http://localhost:${PORT}`);
  // console.log()
});

/* kode dibawah hanya untuk testing silahkan dihapus atau comment jika tidak digunakan */
// let statBots = {}
// statBots = {
//     id: 1,
//     name: "eila",
//   };
// async function loop(num) {
//   setTimeout(() => {
//     num += 1;
//     if (num > 20) num = 0;
//     if (num > 19 && statBots.id === 1 ) {
//       statBots.id = 2
//       statBots.name = 'loli'
//     } else if (num > 19 && statBots.id === 2 ) {
//       statBots.id = 3
//       statBots.name = 'eila'
//     } //else if (num > 19 && statBots.id === 3 ) {
//     //   statBots.id = 4
//     //   statBots.name = 'kokoa'
//     // } else if (num > 19 && statBots.id === 4 ) {
//     //     statBots.id = 5
//     //     statBots.name = 'senor'
//     // } else if (num > 19 && statBots.id === 5 ) {
//     //     statBots.id = 1
//     //     statBots.name = 'aleph'
//     // }
//     statBots.health = num * 5;
//     statBots.hunger = num * 2;
//     //console.log(`num ${statBots.health}`);
//     io.emit("botStatsSUID", statBots);
//     console.log("complete: ", num)
//     loop(num);
//   }, 200);
// }
// loop(0);
