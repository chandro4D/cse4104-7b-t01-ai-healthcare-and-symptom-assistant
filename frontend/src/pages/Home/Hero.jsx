import hero from "../../assets/images/hero.png";

function Hero() {
  return (
    <section className="bg-[#F5FFFD]">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 items-center gap-12">
          <div>
            <p className="text-green-600 font-semibold mb-3">
              AI Powered Healthcare
            </p>

            <h1 className="text-5xl font-bold leading-tight">
              Your Health,
              <br />
              Guided by
              <span className="text-emerald-500">Intelligent AI</span>
            </h1>

            <p className="text-gray-600 mt-6">
              Discover personalized health insights, book appointments, and chat
              with our AI medical assistant.
            </p>

            <div className="mt-8 flex gap-5">
              <button className="bg-emerald-500 hover:bg-emerald-600 px-6 py-3 rounded-lg text-white">
                Start Checking
              </button>

              <button className="border px-6 py-3 rounded-lg">
                Learn More
              </button>
            </div>
          </div>

          <div>
            <img src={hero} alt="Hero" className="w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
