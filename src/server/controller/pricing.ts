import { Request, Response } from "express";
import pug from "pug";
import { cache } from "./service";


export function info(req: Request, res: Response, next: Function): void {

    const tables = cache.getStores()
        .map(cur => {
            return {
                name: cur.getDisplayName()
                    .split(" ")
                    .map(cur => cur.charAt(0).toUpperCase() + cur.substring(1).toLowerCase())
                    .join(" "),
                message: cur.getMessage(),
                headers: cur.getHeaders(),
                data: cur.getDataAsArray().map(cur => cur.toTableBody()),
                indexer: cur.getIndexer()
                    .split(" ")
                    .join("_")
            }
        });

    res.render("price.pug", {
        lastUpdated: cache.getLastUpdated()
            .toLocaleDateString(),
        category: cache.getDisplayNames()
            .map(s => s.split(" ").join("_")),
        tables: tables
    });
}
