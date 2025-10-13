import dynamic from "next/dynamic";
const FirstFitGame = dynamic(() => import("./FirstFitGame"), { ssr: false });
export default FirstFitGame;
