import dotenv from "dotenv";
dotenv.config();

export const { DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME } = process.env;

export const PORT = process.env.PORT;

export const MONGOURL =
  process.env.MONGOURL ||
  `mongodb://${
    DB_USER ? `${DB_USER}:${DB_PASS}@` : ``
  }${DB_HOST}:${DB_PORT}/${DB_NAME}${DB_USER ? `?authSource=admin` : ``}`;


