import { createBrowserRouter } from "react-router-dom";
import PdfRedactor from "../page/PdfRedactor";

const router = createBrowserRouter([
  {
    path: "/",
    element: <PdfRedactor />,
  },
]);

export default router;