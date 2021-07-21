/**
 * Chat App Server
 *
 * Chat app server with Express and MongoDB.
 * 
 * @author Christian P. Byrne
 */

import { Schema, model, connect, Model, NativeError } from "mongoose";
import { __prod__ } from "./constants";
import express, { Request } from "express";
import cors from "cors";

// ──────────────────────────────────────────────────────────────────────────

interface MongoDatabase {
  dbname: string;
  ip: string;
  dbport: number;
  modelNames?: string[];
  models?: Schema[];
}

interface Message {
  time: Date;
  alias: string;
  content: string;
  at?: string;
}

interface ChatRoom extends MongoDatabase {
  ip: string;
  port: number;
  dbport: number;
  Server: express.Express;
  RoomSchema: Schema<Message>;
  MsgModel: Model<Message, {}, {}>;
  constructPost: (req: Request) => Message;
  update: (record: Message) => Promise<void>;
  msgLogs: Array<Message | null>;
  refreshLogs: (depth: number) => Promise<void>;
}

// type LogQuery = Query<Message[], Message, {}, Message>;
let Chatty: MongoDatabase = {
  dbname: "chatty",
  dbport: 27017,
  modelNames: ["message"],
  ip: __prod__ ? "143.198.57.139" : "127.0.0.1",
};

// ───────────────────────────────────────────────────────────────────────────

/**
 *  Chatroom class express and mongo server.
 * @param {MongoDatabase} db - Database details.
 * @implements {MongoDatabse, Message, Chatroom, Query}
 *
 */
class ChatRoom {
  constructor(db: MongoDatabase) {
    this.port = __prod__ ? 80 : 5000;
    this.Server = express();
    this.RoomSchema = new Schema<Message>({
      time: { type: Date, required: true },
      alias: { type: String, required: true },
      content: { type: String, required: true },
      at: { type: String, required: false },
    });
    this.MsgModel = model<Message>("message", this.RoomSchema);
    this.msgLogs = [];
    connect(`mongodb://localhost:${db.dbport}/${db.dbname}`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    /** Add new Message to database. */
    this.update = async (record: Message): Promise<void> => {
      let mutation = new this.MsgModel({
        time: new Date(),
        alias: record.alias,
        content: record.content,
        at: record.at,
      });
      await mutation.save();
    };

    /**
     * Construct obj of type Message.
     * @returns {Message}
     */
    this.constructPost = (req) => {
      const Post: Message = {
        time: new Date(),
        alias: decodeURI(req.params.alias),
        content: decodeURI(req.params.content),
        at: decodeURI(req.params.at),
      };
      return Post;
    };

    // ───────────────────────────────────────────────────────────────────────

    this.Server.use(express.static("public_html"), function (req, res, next) {
      next();
    });
    this.Server.use(cors());
    this.Server.use(express.json());

    this.Server.get("/", (req, res, next) => {
      if (!__prod__) {
        console.log("req:", req);
      }
    });
    this.Server.get("/msg/:alias/:content/:at", (req, res, next) => {
      let post: Message = this.constructPost(req);
      if (!__prod__) {
        console.log("\n\n\nParams\n\n:");
        console.dir(req.params);
        console.log("\n\nMessage Obj\n\n:");
        console.dir(post);
        console.log("\n\n\n");
      }
      this.update(post).catch((err) => console.log(err));
      res.send("x");
    });

    /**
     * Query database. Update this.msgLogs.
     * @param {number} depth
     *
     */
    this.refreshLogs = async (depth: number): Promise<void> => {
      await this.MsgModel.find({}, (err: NativeError, docs: Message[]) => {
        console.log(err);
      })
        .limit(depth)
        .sort({ time: "asc" })
        .exec((err: NativeError | null, res: Message[]) => {
          this.msgLogs = res;
        });
    };
   this.refreshLogs(500);

    this.Server.get("/logs", (req, res, next) => {
      // let depth : string = req.query.depth.toString()
      // if ( !depth ) { depth = "50" };
      this.refreshLogs(500).then(
        () => {
          res.json(this.msgLogs);
        },
        (reason: any) => {
          console.log("read error");
          console.log(reason);
        }
      );
    });
    this.Server.listen(this.port, () => {
      if (!__prod__) {
        console.log(`Listening at ${db.ip} on port ${this.port}.`);
      }
    });
  }
}

new ChatRoom(Chatty);
