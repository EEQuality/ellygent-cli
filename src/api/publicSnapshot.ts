// This public-only client deliberately does not import account, PAT, or CLI configuration.
export const publicOrigin="https://www.ellygent.com";
const base=publicOrigin+"/api/v1/public-projects/";
const bytesCap=2*1024*1024;
export class PublicSnapshotError extends Error {
  constructor(public readonly status:number,message:string){super(message);}
}
export function publicSlug(value:string):string {
  let slug=value.trim();
  if(slug.includes("://")){
    const url=new URL(slug);
    if(url.protocol!=="https:"||!["ellygent.com","www.ellygent.com"].includes(url.host)||url.username||url.password)
      throw new Error("Use an Ellygent public project link.");
    const match=url.pathname.match(/^\/p\/([A-Za-z0-9_-]+)\/?$/);
    if(!match)throw new Error("Use an Ellygent public project link.");
    slug=match[1];
  }
  if(!/^[A-Za-z0-9_-]{1,180}$/.test(slug))throw new Error("Enter a public project slug or Ellygent public link.");
  return slug;
}
type Requester=typeof fetch;
export class PublicSnapshotClient {
  constructor(private request:Requester=fetch){}
  private async get(path="",params?:URLSearchParams,signal?:AbortSignal):Promise<unknown>{
    const url=new URL(path,base);
    if(params)url.search=params.toString();
    const timeout=AbortSignal.timeout(12000);
    let response:Response;
    try{response=await this.request(url,{method:"GET",headers:{Accept:"application/json"},credentials:"omit",redirect:"error",cache:"no-store",signal:signal?AbortSignal.any([signal,timeout]):timeout});}
    catch{throw new PublicSnapshotError(0,"Could not reach Ellygent’s public projects.");}
    if(!response.ok){
      const message=response.status===404?"Public snapshot not found or public projects are unavailable."
        :response.status===429?"Public browsing is rate-limited. Try again shortly.":"Could not load this public snapshot.";
      throw new PublicSnapshotError(response.status,message);
    }
    if(!response.body)throw new PublicSnapshotError(response.status,"The public response was empty.");
    const reader=response.body.getReader();let length=0;const blocks:Uint8Array[]=[];
    try{
      for(;;){
        const {done,value}=await reader.read();
        if(done)break;
        length+=value.byteLength;
        if(length>bytesCap){await reader.cancel();throw new PublicSnapshotError(response.status,"The public response is too large.");}
        blocks.push(value);
      }
      return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(Buffer.concat(blocks,length)));
    }catch(error){if(error instanceof PublicSnapshotError)throw error;throw new PublicSnapshotError(response.status,"Ellygent returned an invalid public response.");}
    finally{reader.releaseLock();}
  }
  gallery(signal?:AbortSignal){return this.get("",undefined,signal);}
  outline(slug:string,signal?:AbortSignal){return this.viewer(slug,{mode:"outline"},signal);}
  search(slug:string,query:string,offset=0,signal?:AbortSignal){
    const q=query.trim();
    if(!q||q.length>200)throw new Error("Enter 1 to 200 characters to search.");
    return this.viewer(slug,{mode:"search",q,offset:String(this.offset(offset)),limit:"100"},signal);
  }
  document(slug:string,document:string,offset=0,signal?:AbortSignal){
    return this.viewer(slug,{mode:"document",document:this.identifier(document),offset:String(this.offset(offset)),limit:"100"},signal);
  }
  item(slug:string,object:string,signal?:AbortSignal){
    return this.viewer(slug,{mode:"detail",object:this.identifier(object)},signal);
  }
  private viewer(slug:string,params:Record<string,string>,signal?:AbortSignal){
    return this.get(encodeURIComponent(publicSlug(slug))+"/viewer/",new URLSearchParams(params),signal);
  }
  private offset(value:number){if(!Number.isSafeInteger(value)||value<0)throw new Error("Offset must be a non-negative integer.");return value;}
  private identifier(value:string){
    if(!value||value.length>240||/[\u0000-\u001f\u007f]/.test(value))throw new Error("Invalid public item identifier.");
    return value;
  }
}
