self.addEventListener("fetch", async (event) => {
    const url = event.request.url;
    
    // Check if it's a .ts file
    if (url.endsWith(".ts")) {
        console.log("Intercepting TS request:", url);
        window.setError("Intercepting TS request:", url)
        const segmentName = url.toString().split("/").pop();
        // Request the segment over WebSockets
        socket.emit("segment",segmentName);
        window.setError(segmentName)
        // Wait for the segment to be received
        while (!window.segmentCache.has(segmentName)) {
            await new Promise(resolve => {
                window.data_resolve = resolve;
                window.currentSegmentName = segmentName;
            }); // Small delay
        }

        const segmentData = window.segmentCache.get(segmentName);
        window.segmentCache.delete(segmentName);

        event.respondWith(
            new Response(segmentData, {
                        status: 200,
                        headers: {
                            "Content-Type": "video/MP2T",
                            "Access-Control-Allow-Origin": "*", // Fix CORS
                            "Cache-Control": "no-store"
                        }
        }));
    }
});
