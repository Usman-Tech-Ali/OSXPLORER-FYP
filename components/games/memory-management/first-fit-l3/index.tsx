import dynamic from "next/dynamic";
const FirstFitGameL3 = dynamic(() => import("./FirstFitGame"), { ssr: false });
export default FirstFitGameL3;
