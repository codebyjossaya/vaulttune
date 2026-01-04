
import Header from "@/app/components/Header";
export default function Home() {
  return (

    <div className="h-screen">
      <Header></Header>
      <div className="flex flex-col items-center justify-center text-center w-full h-[50vh] gap-4 pt-30">
        <h1 className="text-4xl ">Your personal self-hosted music platform</h1>
        <p className="text-xl">Stream your music anywhere, anytime, on any device.</p>
        <a className="button" href="app">Try it out</a>
      </div>
      <div className="section bg-indigo-900 p-10 px-20">
        <h1>VaultTune provides a seamless, <span className="italic">fast</span> streaming experience on all of your devices with plenty of features.</h1>
        <div className="grid grid-rows-3 lg:grid-cols-3 mt-4 gap-4">
          <div className="bg-gray-800 bg-opacity-30 p-4 rounded-md">
            <h2>Socket.io</h2>
            <p>For fast, chunk-based streaming of songs that start playing instantly.</p>
          </div>
          <div className="bg-gray-800 bg-opacity-30 p-4 rounded-md">
            <h2>Shared Vaults</h2>
            <p>When you want to share your music with your friends too.</p>
          </div>
          <div className="bg-gray-800 bg-opacity-30 p-4 rounded-md">
            <h2>Shared Listening Experiences</h2>
            <p>Share one queue, and one play/pause button with multiple people at a time.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
