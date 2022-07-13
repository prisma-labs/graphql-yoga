import fs from "fs";

export async function isWriteAccess(path: string) {
  try {
    await fs.promises.access(path, (fs.constants || fs).W_OK);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}
