"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const env_1 = require("./env");
const { combine, timestamp, printf, colorize } = winston_1.default.format;
const logFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
    return `${ts} [${level}]: ${message}${metaStr}`;
});
exports.logger = winston_1.default.createLogger({
    level: env_1.env.nodeEnv === "production" ? "info" : "debug",
    format: combine(timestamp(), logFormat),
    transports: [
        new winston_1.default.transports.Console({
            format: combine(colorize(), timestamp(), logFormat),
        }),
    ],
});
//# sourceMappingURL=logger.js.map