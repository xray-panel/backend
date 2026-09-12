import { z } from 'zod';
export declare namespace ClearLogsCommand {
    const url: "/node/xray/clear-logs";
    const ResponseSchema: z.ZodObject<{
        response: z.ZodObject<{
            directory: z.ZodString;
            rotated: z.ZodBoolean;
            removedArchives: z.ZodNumber;
            bytesFreed: z.ZodNumber;
            truncatedCurrent: z.ZodBoolean;
        }, z.core.$strip>;
    }, z.core.$strip>;
    type Response = z.infer<typeof ResponseSchema>;
}
//# sourceMappingURL=clear-logs.command.d.ts.map