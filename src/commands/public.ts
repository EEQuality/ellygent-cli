import type { Command } from "commander";
import { PublicSnapshotClient } from "../api/publicSnapshot.js";

export function registerPublicCommands(root:Command,client=new PublicSnapshotClient()){
  const publicCommand=root.command("public").description("Browse approved public snapshots without a token (JSON output)");
  async function display(run:()=>Promise<unknown>){
    try{process.stdout.write(JSON.stringify(await run(),null,2)+"\n");}
    catch(error){process.stderr.write((error instanceof Error?error.message:"Could not read public snapshot.")+"\n");process.exitCode=1;}
  }
  publicCommand.command("list").description("List published projects").action(()=>display(()=>client.gallery()));
  publicCommand.command("inspect <project>").description("Read the published document outline").action((project:string)=>display(()=>client.outline(project)));
  publicCommand.command("search <project> <query>").description("Search published items").option("--offset <n>","Result offset","0")
    .action((project:string,query:string,opts:{offset:string})=>display(()=>client.search(project,query,Number(opts.offset))));
  publicCommand.command("document <project> <document>").description("Read a page of published document items").option("--offset <n>","Item offset","0")
    .action((project:string,document:string,opts:{offset:string})=>display(()=>client.document(project,document,Number(opts.offset))));
  publicCommand.command("item <project> <item>").description("Read one published item and its published links").action((project:string,item:string)=>display(()=>client.item(project,item)));
}
