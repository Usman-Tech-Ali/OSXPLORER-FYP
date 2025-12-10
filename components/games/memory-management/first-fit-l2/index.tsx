import dynamic from "next/dynamic";
const FirstFitGameL2 = dynamic(() => import("./FirstFitGame"), { ssr: false });
export default FirstFitGameL2;
