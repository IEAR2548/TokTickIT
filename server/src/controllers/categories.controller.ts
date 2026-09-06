import { Request, Response, NextFunction } from "express";
import { getActiveCategories } from "../services/categories.service";

export async function getCategoriesHandler(
    _req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const categories = await getActiveCategories();
        res.status(200).json(categories);
    } catch (error) {
        next(error);
    }
}