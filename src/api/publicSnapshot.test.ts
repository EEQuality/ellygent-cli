import { describe, expect, it, vi } from "vitest";
import { PublicSnapshotClient, publicSlug } from "./publicSnapshot.js";

describe("public snapshots",()=>{
  it("accepts only the approved public project URL or slug",()=>{
    expect(publicSlug("https://ellygent.com/p/test-project?utm_source=email")).toBe("test-project");
    for(const value of ["https://other.invalid/p/test","https://x@ellygent.com/p/test","http://ellygent.com/p/test","https://ellygent.com/org/p/test","../private"])
      expect(()=>publicSlug(value)).toThrow();
  });
  it("uses only anonymous GET, fixed destination, no cache, and no redirects",async()=>{
    const request=vi.fn(async()=>new Response(JSON.stringify({items:[]})));
    const c=new PublicSnapshotClient(request as unknown as typeof fetch);
    await c.search("test","name & #?",100);
    const [url,init]=request.mock.calls[0] as unknown as [URL,RequestInit];
    expect(url.origin).toBe("https://www.ellygent.com");
    expect(url.pathname).toBe("/api/v1/public-projects/test/viewer/");
    expect(url.searchParams.get("mode")).toBe("search");
    expect(url.searchParams.get("q")).toBe("name & #?");
    expect(url.searchParams.get("offset")).toBe("100");
    expect(init).toMatchObject({method:"GET",credentials:"omit",redirect:"error",cache:"no-store",headers:{Accept:"application/json"}});
    expect(new Headers(init.headers).has("authorization")).toBe(false);
    expect(new Headers(init.headers).has("cookie")).toBe(false);
  });
  it("does not retry a missing or unpublished snapshot with account access",async()=>{
    const request=vi.fn(async()=>new Response("untrusted error body",{status:404}));
    const c=new PublicSnapshotClient(request as unknown as typeof fetch);
    await expect(c.outline("unpublished")).rejects.toMatchObject({status:404,message:"Public snapshot not found or public projects are unavailable."});
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("bounds responses and rejects invalid search or pagination without sending a request",async()=>{
    const request=vi.fn(async()=>new Response(" ".repeat(2*1024*1024+1)));
    const c=new PublicSnapshotClient(request as unknown as typeof fetch);
    expect(()=>c.search("p"," ")).toThrow();
    expect(()=>c.document("p","doc",-1)).toThrow();
    expect(request).not.toHaveBeenCalled();
    await expect(c.gallery()).rejects.toThrow("too large");
  });
});
