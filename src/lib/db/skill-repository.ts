import { db } from "./index";
import { Skill, CreateSkillInput } from "./types";
import { generateSlug } from "../utils/slug";

export interface ISkillRepository {
  listSkills(): Promise<Skill[]>;
  createSkill(input: CreateSkillInput): Promise<Skill>;
  deleteSkill(id: string): Promise<void>;
  findByName(name: string): Promise<Skill | null>;
}

export class SkillRepository implements ISkillRepository {
  async listSkills(): Promise<Skill[]> {
    const rows = await db`
      SELECT id, name, slug, category, created_at
      FROM public.skills
      ORDER BY name ASC;
    `;
    return rows as unknown as Skill[];
  }

  async findByName(name: string): Promise<Skill | null> {
    const rows = await db`
      SELECT id, name, slug, category, created_at
      FROM public.skills
      WHERE LOWER(name) = ${name.toLowerCase().trim()}
      LIMIT 1;
    `;
    if (!rows || rows.length === 0) return null;
    return rows[0] as unknown as Skill;
  }

  async createSkill(input: CreateSkillInput): Promise<Skill> {
    const name = input.name.trim();
    const slug = input.slug ? generateSlug(input.slug) : generateSlug(name);
    const category = input.category?.trim() || "general";

    const rows = await db`
      INSERT INTO public.skills (name, slug, category, created_at)
      VALUES (${name}, ${slug}, ${category}, NOW())
      ON CONFLICT (name) DO UPDATE SET
        category = EXCLUDED.category
      RETURNING *;
    `;

    return rows[0] as unknown as Skill;
  }

  async deleteSkill(id: string): Promise<void> {
    await db`DELETE FROM public.skills WHERE id = ${id}::uuid;`;
  }
}

export const skillRepository = new SkillRepository();
