// socket.ts
import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getGoogleUser } from "@/api/third-party/user.js";
import { findUser } from "@/api/user/services/user.js";
import { SchemaUser } from "@/api/images/services/types.js";
import { jwtHandler } from "@/api/auth/helpers.js";

let io: SocketIOServer | undefined;

type ListenEvents = Record<string, unknown>;
type ServerEvents = Record<string, unknown>;
type InterEvents = Record<string, unknown>;
interface SocketData {
  user: SchemaUser;
}

export const initializeSocket = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer<ListenEvents, ServerEvents, InterEvents, SocketData>(
    server,
  );

  io.use(async (socket, next) => {
    try {
      const { access_token } = jwtHandler.verify(socket.handshake.auth.jwt);

      const { email } = await getGoogleUser(access_token);
      const appUser = await findUser(email);

      socket.data.user = appUser;
      next();
    } catch (err) {
      console.error(`Socket Auth ERROR`, err);
      next(new Error("Auth failed"));
    }
  });

  io.on("connection", (socket: Socket) => {
    console.info("connected, adding socketId");
    socket.join(socket.data.user.id.toString());

    socket.on("disconnect", () => {
      console.info("disconnected, removing socketId");
    });
  });

  return io;
};

export const getSocketInstance = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.io not initialized! Call initializeSocket first.");
  }
  return io;
};
