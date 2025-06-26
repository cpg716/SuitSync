-- AlterTable
ALTER TABLE "_SkillToUser" ADD CONSTRAINT "_SkillToUser_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_SkillToUser_AB_unique";
