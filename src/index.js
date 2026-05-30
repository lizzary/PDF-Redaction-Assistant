// App entry point

import React from 'react';
import ReactDOM from 'react-dom/client';

import router from "./router/router";
import {RouterProvider} from "react-router-dom";
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
    // <React.StrictMode>
    //     <RouterProvider router={router}></RouterProvider>
    // </React.StrictMode>
    <RouterProvider router={router}></RouterProvider>

);