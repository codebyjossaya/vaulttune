
export function updateEndHandler(source: MediaSource, current: HTMLAudioElement): Promise<boolean> {
    return new Promise((resolve, reject) => {
        try {
            source.onsourceended = () => {
                if(current) {
                    current!.src = '';
                    current.load();
                    console.log("Opening MediaSource");
                }
                resolve(true)
            }
            
        } catch (error) {
            reject(error);
            console.error("Error ending the stream: ", error)
        }
    });
}    