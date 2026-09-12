"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClearLogsCommand = void 0;
const zod_1 = require("zod");
const api_1 = require("../../api");
var ClearLogsCommand;
(function (ClearLogsCommand) {
    ClearLogsCommand.url = api_1.REST_API.XRAY.CLEAR_LOGS;
    ClearLogsCommand.ResponseSchema = zod_1.z.object({
        response: zod_1.z.object({
            directory: zod_1.z.string(),
            rotated: zod_1.z.boolean(),
            removedArchives: zod_1.z.number(),
            bytesFreed: zod_1.z.number(),
            truncatedCurrent: zod_1.z.boolean(),
        }),
    });
})(ClearLogsCommand || (exports.ClearLogsCommand = ClearLogsCommand = {}));
