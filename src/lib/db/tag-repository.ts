import { db } from "./index";
import { Tag, CreateTagInput } from "./types";
import { generateSlug } from "../utils/slug";

export interface ITagRepository {
  listTags(): Promise<Tag[]>;
  createTag(input: CreateTagInput): Promise<Tag>;
  deleteTag(id: string): Promise<void>;
  findByName(name: string): Promise<Tag | null>;
}

export class TagRepository implements ITagRepository {
  async listTags(): Promise<Tag[]> {
    const rows = await db`
      SELECT id, name, slug, category, created_at
      FROM public.tags
      ORDER BY name ASC;
    `;
    return rows as unknown as Tag[];
  }

  async findByName(name: string): Promise<Tag | null> {
    const rows = await db`
      SELECT id, name, slug, category, created_at
      FROM public.tags
      WHERE LOWER(name) = ${name.toLowerCase().trim()}
      LIMIT 1;
    `;
    if (!rows || rows.length === 0) return null;
    return rows[0] as unknown as Tag;
  }

  async createTag(input: CreateTagInput): Promise<Tag> {
    const name = input.name.trim();
    const slug = input.slug ? generateSlug(input.slug) : generateSlug(name);
    const category = input.category?.trim() || "general";

    const rows = await db`
      INSERT INTO public.tags (name, slug, category, created_at)
      VALUES (${name}, ${slug}, ${category}, NOW())
      ON CONFLICT (name) DO UPDATE SET
        category = EXCLUDED.category
      RETURNING *;
    `;

    return rows[0] as unknown as Tag;
  }

  async deleteTag(id: string): Promise<void> {
    await db`DELETE FROM public.tags WHERE id = ${id}::uuid;`;
  }
}

export const tagRepository = new TagRepository();
