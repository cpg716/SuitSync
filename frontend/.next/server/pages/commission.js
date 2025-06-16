/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "pages/commission";
exports.ids = ["pages/commission"];
exports.modules = {

/***/ "(pages-dir-node)/./components/Layout.tsx":
/*!*******************************!*\
  !*** ./components/Layout.tsx ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ Layout)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_link__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/link */ \"(pages-dir-node)/./node_modules/next/link.js\");\n/* harmony import */ var next_link__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(next_link__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/router */ \"(pages-dir-node)/./node_modules/next/router.js\");\n/* harmony import */ var next_router__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_router__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _barrel_optimize_names_BarChart_Calendar_Home_Menu_Moon_Printer_Scissors_Settings_Sun_Users_lucide_react__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! __barrel_optimize__?names=BarChart,Calendar,Home,Menu,Moon,Printer,Scissors,Settings,Sun,Users!=!lucide-react */ \"(pages-dir-node)/__barrel_optimize__?names=BarChart,Calendar,Home,Menu,Moon,Printer,Scissors,Settings,Sun,Users!=!./node_modules/lucide-react/dist/esm/lucide-react.js\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_3__);\n// frontend/components/Layout.tsx\n\n\n\n\n\nconst nav = [\n    {\n        href: '/',\n        label: 'Dashboard',\n        icon: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_BarChart_Calendar_Home_Menu_Moon_Printer_Scissors_Settings_Sun_Users_lucide_react__WEBPACK_IMPORTED_MODULE_4__.Home, {\n            size: 20\n        }, void 0, false, {\n            fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n            lineNumber: 8,\n            columnNumber: 42\n        }, undefined)\n    },\n    {\n        href: '/parties',\n        label: 'Parties',\n        icon: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_BarChart_Calendar_Home_Menu_Moon_Printer_Scissors_Settings_Sun_Users_lucide_react__WEBPACK_IMPORTED_MODULE_4__.Users, {\n            size: 20\n        }, void 0, false, {\n            fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n            lineNumber: 9,\n            columnNumber: 47\n        }, undefined)\n    },\n    {\n        href: '/appointments',\n        label: 'Appointments',\n        icon: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_BarChart_Calendar_Home_Menu_Moon_Printer_Scissors_Settings_Sun_Users_lucide_react__WEBPACK_IMPORTED_MODULE_4__.Calendar, {\n            size: 20\n        }, void 0, false, {\n            fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n            lineNumber: 10,\n            columnNumber: 57\n        }, undefined)\n    },\n    {\n        href: '/alterations',\n        label: 'Alterations',\n        icon: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_BarChart_Calendar_Home_Menu_Moon_Printer_Scissors_Settings_Sun_Users_lucide_react__WEBPACK_IMPORTED_MODULE_4__.Scissors, {\n            size: 20\n        }, void 0, false, {\n            fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n            lineNumber: 11,\n            columnNumber: 55\n        }, undefined)\n    },\n    {\n        href: '/tag',\n        label: 'Tag Printing',\n        icon: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_BarChart_Calendar_Home_Menu_Moon_Printer_Scissors_Settings_Sun_Users_lucide_react__WEBPACK_IMPORTED_MODULE_4__.Printer, {\n            size: 20\n        }, void 0, false, {\n            fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n            lineNumber: 12,\n            columnNumber: 48\n        }, undefined)\n    },\n    {\n        href: '/commission',\n        label: 'Commissions',\n        icon: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_BarChart_Calendar_Home_Menu_Moon_Printer_Scissors_Settings_Sun_Users_lucide_react__WEBPACK_IMPORTED_MODULE_4__.BarChart, {\n            size: 20\n        }, void 0, false, {\n            fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n            lineNumber: 13,\n            columnNumber: 54\n        }, undefined)\n    },\n    {\n        href: '/admin',\n        label: 'Settings',\n        icon: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_BarChart_Calendar_Home_Menu_Moon_Printer_Scissors_Settings_Sun_Users_lucide_react__WEBPACK_IMPORTED_MODULE_4__.Settings, {\n            size: 20\n        }, void 0, false, {\n            fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n            lineNumber: 14,\n            columnNumber: 46\n        }, undefined)\n    }\n];\nfunction Layout({ children }) {\n    const router = (0,next_router__WEBPACK_IMPORTED_MODULE_2__.useRouter)();\n    const [dark, setDark] = (0,react__WEBPACK_IMPORTED_MODULE_3__.useState)(false);\n    const [sidebarOpen, setSidebarOpen] = (0,react__WEBPACK_IMPORTED_MODULE_3__.useState)(false);\n    const [collapsed, setCollapsed] = (0,react__WEBPACK_IMPORTED_MODULE_3__.useState)(false);\n    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)({\n        \"Layout.useEffect\": ()=>{\n            if (localStorage.theme === 'dark') setDark(true);\n        }\n    }[\"Layout.useEffect\"], []);\n    (0,react__WEBPACK_IMPORTED_MODULE_3__.useEffect)({\n        \"Layout.useEffect\": ()=>{\n            document.documentElement.classList.toggle('dark', dark);\n            localStorage.theme = dark ? 'dark' : 'light';\n        }\n    }[\"Layout.useEffect\"], [\n        dark\n    ]);\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n        className: \"flex min-h-screen bg-gray-50 dark:bg-gray-900\",\n        children: [\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                className: \"md:hidden fixed top-4 left-4 z-50 p-2 rounded bg-blue-600 text-white\",\n                onClick: ()=>setSidebarOpen((o)=>!o),\n                \"aria-label\": \"Open sidebar\",\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_BarChart_Calendar_Home_Menu_Moon_Printer_Scissors_Settings_Sun_Users_lucide_react__WEBPACK_IMPORTED_MODULE_4__.Menu, {\n                    size: 24\n                }, void 0, false, {\n                    fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                    lineNumber: 40,\n                    columnNumber: 9\n                }, this)\n            }, void 0, false, {\n                fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                lineNumber: 35,\n                columnNumber: 7\n            }, this),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"aside\", {\n                className: `\n          z-40 fixed top-0 left-0 h-full\n          bg-white dark:bg-gray-800 text-neutral-900 dark:text-neutral-100 shadow-sm\n          transition-all duration-200\n          flex flex-col\n          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0\n          ${collapsed ? 'w-16' : 'w-48'}\n        `,\n                style: {\n                    minWidth: collapsed ? '4rem' : '12rem'\n                },\n                children: [\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                        className: \"hidden md:flex items-center justify-center w-8 h-8 absolute top-4 right-[-16px] bg-blue-600 text-white rounded-full shadow transition-transform hover:scale-110\",\n                        style: {\n                            zIndex: 60\n                        },\n                        onClick: ()=>setCollapsed((c)=>!c),\n                        \"aria-label\": collapsed ? 'Expand sidebar' : 'Collapse sidebar',\n                        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"span\", {\n                            className: `transform transition-transform ${collapsed ? 'rotate-180' : ''}`,\n                            children: '<'\n                        }, void 0, false, {\n                            fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                            lineNumber: 62,\n                            columnNumber: 11\n                        }, this)\n                    }, void 0, false, {\n                        fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                        lineNumber: 56,\n                        columnNumber: 9\n                    }, this),\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"nav\", {\n                        className: \"mt-6 space-y-1 flex-1\",\n                        children: nav.map((item)=>/*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)((next_link__WEBPACK_IMPORTED_MODULE_1___default()), {\n                                legacyBehavior: true,\n                                href: item.href,\n                                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"a\", {\n                                    className: `flex items-center gap-3 px-4 py-3 rounded-l-2xl font-medium text-base text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition\n                  ${router.pathname === item.href ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}\n                  ${collapsed ? 'justify-center px-2' : ''}\n                `,\n                                    onClick: ()=>setSidebarOpen(false),\n                                    title: collapsed ? item.label : undefined,\n                                    children: [\n                                        item.icon,\n                                        !collapsed && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"span\", {\n                                            className: \"ml-2\",\n                                            children: item.label\n                                        }, void 0, false, {\n                                            fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                                            lineNumber: 76,\n                                            columnNumber: 32\n                                        }, this)\n                                    ]\n                                }, void 0, true, {\n                                    fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                                    lineNumber: 67,\n                                    columnNumber: 15\n                                }, this)\n                            }, item.href, false, {\n                                fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                                lineNumber: 66,\n                                columnNumber: 13\n                            }, this))\n                    }, void 0, false, {\n                        fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                        lineNumber: 64,\n                        columnNumber: 9\n                    }, this),\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                        className: `mt-auto p-4 border-t border-gray-200 dark:border-gray-700 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`,\n                        children: [\n                            !collapsed && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"span\", {\n                                className: \"text-sm\",\n                                children: \"Theme\"\n                            }, void 0, false, {\n                                fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                                lineNumber: 82,\n                                columnNumber: 26\n                            }, this),\n                            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"button\", {\n                                onClick: ()=>setDark((d)=>!d),\n                                className: \"p-2 rounded bg-blue-100 dark:bg-blue-900\",\n                                children: dark ? /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_BarChart_Calendar_Home_Menu_Moon_Printer_Scissors_Settings_Sun_Users_lucide_react__WEBPACK_IMPORTED_MODULE_4__.Sun, {\n                                    size: 18\n                                }, void 0, false, {\n                                    fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                                    lineNumber: 84,\n                                    columnNumber: 21\n                                }, this) : /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_BarChart_Calendar_Home_Menu_Moon_Printer_Scissors_Settings_Sun_Users_lucide_react__WEBPACK_IMPORTED_MODULE_4__.Moon, {\n                                    size: 18\n                                }, void 0, false, {\n                                    fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                                    lineNumber: 84,\n                                    columnNumber: 41\n                                }, this)\n                            }, void 0, false, {\n                                fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                                lineNumber: 83,\n                                columnNumber: 11\n                            }, this)\n                        ]\n                    }, void 0, true, {\n                        fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                        lineNumber: 81,\n                        columnNumber: 9\n                    }, this)\n                ]\n            }, void 0, true, {\n                fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                lineNumber: 44,\n                columnNumber: 7\n            }, this),\n            sidebarOpen && /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"fixed inset-0 bg-black/30 md:hidden\",\n                onClick: ()=>setSidebarOpen(false)\n            }, void 0, false, {\n                fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                lineNumber: 90,\n                columnNumber: 23\n            }, this),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"main\", {\n                className: `flex-1 p-6 overflow-auto transition-all duration-200\n          md:ml-0\n          ${sidebarOpen ? 'blur-sm pointer-events-none select-none' : ''}\n          ${collapsed ? 'md:ml-16' : 'md:ml-48'}\n        `,\n                children: children\n            }, void 0, false, {\n                fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n                lineNumber: 93,\n                columnNumber: 7\n            }, this)\n        ]\n    }, void 0, true, {\n        fileName: \"/Users/cpg/suitsync_full/frontend/components/Layout.tsx\",\n        lineNumber: 33,\n        columnNumber: 5\n    }, this);\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL2NvbXBvbmVudHMvTGF5b3V0LnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQUEsaUNBQWlDOztBQUNKO0FBQ1c7QUFDcUU7QUFDakU7QUFFNUMsTUFBTWMsTUFBTTtJQUNWO1FBQUVDLE1BQU07UUFBS0MsT0FBTztRQUFhQyxvQkFBTSw4REFBQ2YsMElBQUlBO1lBQUNnQixNQUFNOzs7Ozs7SUFBTztJQUMxRDtRQUFFSCxNQUFNO1FBQVlDLE9BQU87UUFBV0Msb0JBQU0sOERBQUNkLDJJQUFLQTtZQUFDZSxNQUFNOzs7Ozs7SUFBTztJQUNoRTtRQUFFSCxNQUFNO1FBQWlCQyxPQUFPO1FBQWdCQyxvQkFBTSw4REFBQ2IsOElBQVFBO1lBQUNjLE1BQU07Ozs7OztJQUFPO0lBQzdFO1FBQUVILE1BQU07UUFBZ0JDLE9BQU87UUFBZUMsb0JBQU0sOERBQUNaLDhJQUFRQTtZQUFDYSxNQUFNOzs7Ozs7SUFBTztJQUMzRTtRQUFFSCxNQUFNO1FBQVFDLE9BQU87UUFBZ0JDLG9CQUFNLDhEQUFDWCw2SUFBT0E7WUFBQ1ksTUFBTTs7Ozs7O0lBQU87SUFDbkU7UUFBRUgsTUFBTTtRQUFlQyxPQUFPO1FBQWVDLG9CQUFNLDhEQUFDViw4SUFBUUE7WUFBQ1csTUFBTTs7Ozs7O0lBQU87SUFDMUU7UUFBRUgsTUFBTTtRQUFVQyxPQUFPO1FBQVlDLG9CQUFNLDhEQUFDVCw4SUFBUUE7WUFBQ1UsTUFBTTs7Ozs7O0lBQU87Q0FDbkU7QUFFYyxTQUFTQyxPQUFPLEVBQUVDLFFBQVEsRUFBRTtJQUN6QyxNQUFNQyxTQUFTcEIsc0RBQVNBO0lBQ3hCLE1BQU0sQ0FBQ3FCLE1BQU1DLFFBQVEsR0FBR1gsK0NBQVFBLENBQUM7SUFDakMsTUFBTSxDQUFDWSxhQUFhQyxlQUFlLEdBQUdiLCtDQUFRQSxDQUFDO0lBQy9DLE1BQU0sQ0FBQ2MsV0FBV0MsYUFBYSxHQUFHZiwrQ0FBUUEsQ0FBQztJQUUzQ0MsZ0RBQVNBOzRCQUFDO1lBQ1IsSUFBSWUsYUFBYUMsS0FBSyxLQUFLLFFBQVFOLFFBQVE7UUFDN0M7MkJBQUcsRUFBRTtJQUVMVixnREFBU0E7NEJBQUM7WUFDUmlCLFNBQVNDLGVBQWUsQ0FBQ0MsU0FBUyxDQUFDQyxNQUFNLENBQUMsUUFBUVg7WUFDbERNLGFBQWFDLEtBQUssR0FBR1AsT0FBTyxTQUFTO1FBQ3ZDOzJCQUFHO1FBQUNBO0tBQUs7SUFFVCxxQkFDRSw4REFBQ1k7UUFBSUMsV0FBVTs7MEJBRWIsOERBQUNDO2dCQUNDRCxXQUFVO2dCQUNWRSxTQUFTLElBQU1aLGVBQWVhLENBQUFBLElBQUssQ0FBQ0E7Z0JBQ3BDQyxjQUFXOzBCQUVYLDRFQUFDNUIsMElBQUlBO29CQUFDTyxNQUFNOzs7Ozs7Ozs7OzswQkFJZCw4REFBQ3NCO2dCQUNDTCxXQUFXLENBQUM7Ozs7O1VBS1YsRUFBRVgsY0FBYyxrQkFBa0Isb0JBQW9CO1VBQ3RELEVBQUVFLFlBQVksU0FBUyxPQUFPO1FBQ2hDLENBQUM7Z0JBQ0RlLE9BQU87b0JBQUVDLFVBQVVoQixZQUFZLFNBQVM7Z0JBQVE7O2tDQUdoRCw4REFBQ1U7d0JBQ0NELFdBQVU7d0JBQ1ZNLE9BQU87NEJBQUVFLFFBQVE7d0JBQUc7d0JBQ3BCTixTQUFTLElBQU1WLGFBQWFpQixDQUFBQSxJQUFLLENBQUNBO3dCQUNsQ0wsY0FBWWIsWUFBWSxtQkFBbUI7a0NBRTNDLDRFQUFDbUI7NEJBQUtWLFdBQVcsQ0FBQywrQkFBK0IsRUFBRVQsWUFBWSxlQUFlLElBQUk7c0NBQUc7Ozs7Ozs7Ozs7O2tDQUV2Riw4REFBQ1o7d0JBQUlxQixXQUFVO2tDQUNackIsSUFBSWdDLEdBQUcsQ0FBQ0MsQ0FBQUEscUJBQ1AsOERBQUMvQyxrREFBSUE7Z0NBQUNnRCxjQUFjO2dDQUFpQmpDLE1BQU1nQyxLQUFLaEMsSUFBSTswQ0FDbEQsNEVBQUNrQztvQ0FDQ2QsV0FBVyxDQUFDO2tCQUNWLEVBQUVkLE9BQU82QixRQUFRLEtBQUtILEtBQUtoQyxJQUFJLEdBQUcsa0VBQWtFLEdBQUc7a0JBQ3ZHLEVBQUVXLFlBQVksd0JBQXdCLEdBQUc7Z0JBQzNDLENBQUM7b0NBQ0RXLFNBQVMsSUFBTVosZUFBZTtvQ0FDOUIwQixPQUFPekIsWUFBWXFCLEtBQUsvQixLQUFLLEdBQUdvQzs7d0NBRS9CTCxLQUFLOUIsSUFBSTt3Q0FDVCxDQUFDUywyQkFBYSw4REFBQ21COzRDQUFLVixXQUFVO3NEQUFRWSxLQUFLL0IsS0FBSzs7Ozs7Ozs7Ozs7OytCQVYzQitCLEtBQUtoQyxJQUFJOzs7Ozs7Ozs7O2tDQWV2Qyw4REFBQ21CO3dCQUFJQyxXQUFXLENBQUMsNEVBQTRFLEVBQUVULFlBQVksbUJBQW1CLG1CQUFtQjs7NEJBQzlJLENBQUNBLDJCQUFhLDhEQUFDbUI7Z0NBQUtWLFdBQVU7MENBQVU7Ozs7OzswQ0FDekMsOERBQUNDO2dDQUFPQyxTQUFTLElBQU1kLFFBQVE4QixDQUFBQSxJQUFLLENBQUNBO2dDQUFJbEIsV0FBVTswQ0FDaERiLHFCQUFPLDhEQUFDYix5SUFBR0E7b0NBQUNTLE1BQU07Ozs7O3lEQUFTLDhEQUFDUiwwSUFBSUE7b0NBQUNRLE1BQU07Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O1lBTTdDTSw2QkFBZSw4REFBQ1U7Z0JBQUlDLFdBQVU7Z0JBQXNDRSxTQUFTLElBQU1aLGVBQWU7Ozs7OzswQkFHbkcsOERBQUM2QjtnQkFDQ25CLFdBQVcsQ0FBQzs7VUFFVixFQUFFWCxjQUFjLDRDQUE0QyxHQUFHO1VBQy9ELEVBQUVFLFlBQVksYUFBYSxXQUFXO1FBQ3hDLENBQUM7MEJBRUFOOzs7Ozs7Ozs7Ozs7QUFJVCIsInNvdXJjZXMiOlsiL1VzZXJzL2NwZy9zdWl0c3luY19mdWxsL2Zyb250ZW5kL2NvbXBvbmVudHMvTGF5b3V0LnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBmcm9udGVuZC9jb21wb25lbnRzL0xheW91dC50c3hcbmltcG9ydCBMaW5rIGZyb20gJ25leHQvbGluayc7XG5pbXBvcnQgeyB1c2VSb3V0ZXIgfSBmcm9tICduZXh0L3JvdXRlcic7XG5pbXBvcnQgeyBIb21lLCBVc2VycywgQ2FsZW5kYXIsIFNjaXNzb3JzLCBQcmludGVyLCBCYXJDaGFydCwgU2V0dGluZ3MsIFN1biwgTW9vbiwgTWVudSB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5pbXBvcnQgeyB1c2VTdGF0ZSwgdXNlRWZmZWN0IH0gZnJvbSAncmVhY3QnO1xuXG5jb25zdCBuYXYgPSBbXG4gIHsgaHJlZjogJy8nLCBsYWJlbDogJ0Rhc2hib2FyZCcsIGljb246IDxIb21lIHNpemU9ezIwfSAvPiB9LFxuICB7IGhyZWY6ICcvcGFydGllcycsIGxhYmVsOiAnUGFydGllcycsIGljb246IDxVc2VycyBzaXplPXsyMH0gLz4gfSxcbiAgeyBocmVmOiAnL2FwcG9pbnRtZW50cycsIGxhYmVsOiAnQXBwb2ludG1lbnRzJywgaWNvbjogPENhbGVuZGFyIHNpemU9ezIwfSAvPiB9LFxuICB7IGhyZWY6ICcvYWx0ZXJhdGlvbnMnLCBsYWJlbDogJ0FsdGVyYXRpb25zJywgaWNvbjogPFNjaXNzb3JzIHNpemU9ezIwfSAvPiB9LFxuICB7IGhyZWY6ICcvdGFnJywgbGFiZWw6ICdUYWcgUHJpbnRpbmcnLCBpY29uOiA8UHJpbnRlciBzaXplPXsyMH0gLz4gfSxcbiAgeyBocmVmOiAnL2NvbW1pc3Npb24nLCBsYWJlbDogJ0NvbW1pc3Npb25zJywgaWNvbjogPEJhckNoYXJ0IHNpemU9ezIwfSAvPiB9LFxuICB7IGhyZWY6ICcvYWRtaW4nLCBsYWJlbDogJ1NldHRpbmdzJywgaWNvbjogPFNldHRpbmdzIHNpemU9ezIwfSAvPiB9LFxuXTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gTGF5b3V0KHsgY2hpbGRyZW4gfSkge1xuICBjb25zdCByb3V0ZXIgPSB1c2VSb3V0ZXIoKTtcbiAgY29uc3QgW2RhcmssIHNldERhcmtdID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbc2lkZWJhck9wZW4sIHNldFNpZGViYXJPcGVuXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2NvbGxhcHNlZCwgc2V0Q29sbGFwc2VkXSA9IHVzZVN0YXRlKGZhbHNlKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChsb2NhbFN0b3JhZ2UudGhlbWUgPT09ICdkYXJrJykgc2V0RGFyayh0cnVlKTtcbiAgfSwgW10pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC50b2dnbGUoJ2RhcmsnLCBkYXJrKTtcbiAgICBsb2NhbFN0b3JhZ2UudGhlbWUgPSBkYXJrID8gJ2RhcmsnIDogJ2xpZ2h0JztcbiAgfSwgW2RhcmtdKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBtaW4taC1zY3JlZW4gYmctZ3JheS01MCBkYXJrOmJnLWdyYXktOTAwXCI+XG4gICAgICB7LyogTW9iaWxlIHRvZ2dsZSAqL31cbiAgICAgIDxidXR0b25cbiAgICAgICAgY2xhc3NOYW1lPVwibWQ6aGlkZGVuIGZpeGVkIHRvcC00IGxlZnQtNCB6LTUwIHAtMiByb3VuZGVkIGJnLWJsdWUtNjAwIHRleHQtd2hpdGVcIlxuICAgICAgICBvbkNsaWNrPXsoKSA9PiBzZXRTaWRlYmFyT3BlbihvID0+ICFvKX1cbiAgICAgICAgYXJpYS1sYWJlbD1cIk9wZW4gc2lkZWJhclwiXG4gICAgICA+XG4gICAgICAgIDxNZW51IHNpemU9ezI0fSAvPlxuICAgICAgPC9idXR0b24+XG5cbiAgICAgIHsvKiBTaWRlYmFyICovfVxuICAgICAgPGFzaWRlXG4gICAgICAgIGNsYXNzTmFtZT17YFxuICAgICAgICAgIHotNDAgZml4ZWQgdG9wLTAgbGVmdC0wIGgtZnVsbFxuICAgICAgICAgIGJnLXdoaXRlIGRhcms6YmctZ3JheS04MDAgdGV4dC1uZXV0cmFsLTkwMCBkYXJrOnRleHQtbmV1dHJhbC0xMDAgc2hhZG93LXNtXG4gICAgICAgICAgdHJhbnNpdGlvbi1hbGwgZHVyYXRpb24tMjAwXG4gICAgICAgICAgZmxleCBmbGV4LWNvbFxuICAgICAgICAgICR7c2lkZWJhck9wZW4gPyAndHJhbnNsYXRlLXgtMCcgOiAnLXRyYW5zbGF0ZS14LWZ1bGwnfSBtZDp0cmFuc2xhdGUteC0wXG4gICAgICAgICAgJHtjb2xsYXBzZWQgPyAndy0xNicgOiAndy00OCd9XG4gICAgICAgIGB9XG4gICAgICAgIHN0eWxlPXt7IG1pbldpZHRoOiBjb2xsYXBzZWQgPyAnNHJlbScgOiAnMTJyZW0nIH19XG4gICAgICA+XG4gICAgICAgIHsvKiBDb2xsYXBzZS9FeHBhbmQgYnV0dG9uIChkZXNrdG9wIG9ubHkpICovfVxuICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgY2xhc3NOYW1lPVwiaGlkZGVuIG1kOmZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHctOCBoLTggYWJzb2x1dGUgdG9wLTQgcmlnaHQtWy0xNnB4XSBiZy1ibHVlLTYwMCB0ZXh0LXdoaXRlIHJvdW5kZWQtZnVsbCBzaGFkb3cgdHJhbnNpdGlvbi10cmFuc2Zvcm0gaG92ZXI6c2NhbGUtMTEwXCJcbiAgICAgICAgICBzdHlsZT17eyB6SW5kZXg6IDYwIH19XG4gICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0Q29sbGFwc2VkKGMgPT4gIWMpfVxuICAgICAgICAgIGFyaWEtbGFiZWw9e2NvbGxhcHNlZCA/ICdFeHBhbmQgc2lkZWJhcicgOiAnQ29sbGFwc2Ugc2lkZWJhcid9XG4gICAgICAgID5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2B0cmFuc2Zvcm0gdHJhbnNpdGlvbi10cmFuc2Zvcm0gJHtjb2xsYXBzZWQgPyAncm90YXRlLTE4MCcgOiAnJ31gfT57JzwnfTwvc3Bhbj5cbiAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDxuYXYgY2xhc3NOYW1lPVwibXQtNiBzcGFjZS15LTEgZmxleC0xXCI+XG4gICAgICAgICAge25hdi5tYXAoaXRlbSA9PiAoXG4gICAgICAgICAgICA8TGluayBsZWdhY3lCZWhhdmlvciBrZXk9e2l0ZW0uaHJlZn0gaHJlZj17aXRlbS5ocmVmfT5cbiAgICAgICAgICAgICAgPGFcbiAgICAgICAgICAgICAgICBjbGFzc05hbWU9e2BmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMyBweC00IHB5LTMgcm91bmRlZC1sLTJ4bCBmb250LW1lZGl1bSB0ZXh0LWJhc2UgdGV4dC1ncmF5LTcwMCBkYXJrOnRleHQtZ3JheS0zMDAgaG92ZXI6YmctYmx1ZS0xMDAgZGFyazpob3ZlcjpiZy1ibHVlLTkwMCB0cmFuc2l0aW9uXG4gICAgICAgICAgICAgICAgICAke3JvdXRlci5wYXRobmFtZSA9PT0gaXRlbS5ocmVmID8gJ2JnLWJsdWUtMTAwIGRhcms6YmctYmx1ZS05MDAgdGV4dC1ibHVlLTYwMCBkYXJrOnRleHQtYmx1ZS00MDAnIDogJyd9XG4gICAgICAgICAgICAgICAgICAke2NvbGxhcHNlZCA/ICdqdXN0aWZ5LWNlbnRlciBweC0yJyA6ICcnfVxuICAgICAgICAgICAgICAgIGB9XG4gICAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2V0U2lkZWJhck9wZW4oZmFsc2UpfVxuICAgICAgICAgICAgICAgIHRpdGxlPXtjb2xsYXBzZWQgPyBpdGVtLmxhYmVsIDogdW5kZWZpbmVkfVxuICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAge2l0ZW0uaWNvbn1cbiAgICAgICAgICAgICAgICB7IWNvbGxhcHNlZCAmJiA8c3BhbiBjbGFzc05hbWU9XCJtbC0yXCI+e2l0ZW0ubGFiZWx9PC9zcGFuPn1cbiAgICAgICAgICAgICAgPC9hPlxuICAgICAgICAgICAgPC9MaW5rPlxuICAgICAgICAgICkpfVxuICAgICAgICA8L25hdj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9e2BtdC1hdXRvIHAtNCBib3JkZXItdCBib3JkZXItZ3JheS0yMDAgZGFyazpib3JkZXItZ3JheS03MDAgZmxleCBpdGVtcy1jZW50ZXIgJHtjb2xsYXBzZWQgPyAnanVzdGlmeS1jZW50ZXInIDogJ2p1c3RpZnktYmV0d2Vlbid9YH0+XG4gICAgICAgICAgeyFjb2xsYXBzZWQgJiYgPHNwYW4gY2xhc3NOYW1lPVwidGV4dC1zbVwiPlRoZW1lPC9zcGFuPn1cbiAgICAgICAgICA8YnV0dG9uIG9uQ2xpY2s9eygpID0+IHNldERhcmsoZCA9PiAhZCl9IGNsYXNzTmFtZT1cInAtMiByb3VuZGVkIGJnLWJsdWUtMTAwIGRhcms6YmctYmx1ZS05MDBcIj5cbiAgICAgICAgICAgIHtkYXJrID8gPFN1biBzaXplPXsxOH0gLz4gOiA8TW9vbiBzaXplPXsxOH0gLz59XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9hc2lkZT5cblxuICAgICAgey8qIE1vYmlsZSBvdmVybGF5ICovfVxuICAgICAge3NpZGViYXJPcGVuICYmIDxkaXYgY2xhc3NOYW1lPVwiZml4ZWQgaW5zZXQtMCBiZy1ibGFjay8zMCBtZDpoaWRkZW5cIiBvbkNsaWNrPXsoKSA9PiBzZXRTaWRlYmFyT3BlbihmYWxzZSl9IC8+fVxuXG4gICAgICB7LyogTWFpbiBjb250ZW50ICovfVxuICAgICAgPG1haW5cbiAgICAgICAgY2xhc3NOYW1lPXtgZmxleC0xIHAtNiBvdmVyZmxvdy1hdXRvIHRyYW5zaXRpb24tYWxsIGR1cmF0aW9uLTIwMFxuICAgICAgICAgIG1kOm1sLTBcbiAgICAgICAgICAke3NpZGViYXJPcGVuID8gJ2JsdXItc20gcG9pbnRlci1ldmVudHMtbm9uZSBzZWxlY3Qtbm9uZScgOiAnJ31cbiAgICAgICAgICAke2NvbGxhcHNlZCA/ICdtZDptbC0xNicgOiAnbWQ6bWwtNDgnfVxuICAgICAgICBgfVxuICAgICAgPlxuICAgICAgICB7Y2hpbGRyZW59XG4gICAgICA8L21haW4+XG4gICAgPC9kaXY+XG4gICk7XG59XG4iXSwibmFtZXMiOlsiTGluayIsInVzZVJvdXRlciIsIkhvbWUiLCJVc2VycyIsIkNhbGVuZGFyIiwiU2Npc3NvcnMiLCJQcmludGVyIiwiQmFyQ2hhcnQiLCJTZXR0aW5ncyIsIlN1biIsIk1vb24iLCJNZW51IiwidXNlU3RhdGUiLCJ1c2VFZmZlY3QiLCJuYXYiLCJocmVmIiwibGFiZWwiLCJpY29uIiwic2l6ZSIsIkxheW91dCIsImNoaWxkcmVuIiwicm91dGVyIiwiZGFyayIsInNldERhcmsiLCJzaWRlYmFyT3BlbiIsInNldFNpZGViYXJPcGVuIiwiY29sbGFwc2VkIiwic2V0Q29sbGFwc2VkIiwibG9jYWxTdG9yYWdlIiwidGhlbWUiLCJkb2N1bWVudCIsImRvY3VtZW50RWxlbWVudCIsImNsYXNzTGlzdCIsInRvZ2dsZSIsImRpdiIsImNsYXNzTmFtZSIsImJ1dHRvbiIsIm9uQ2xpY2siLCJvIiwiYXJpYS1sYWJlbCIsImFzaWRlIiwic3R5bGUiLCJtaW5XaWR0aCIsInpJbmRleCIsImMiLCJzcGFuIiwibWFwIiwiaXRlbSIsImxlZ2FjeUJlaGF2aW9yIiwiYSIsInBhdGhuYW1lIiwidGl0bGUiLCJ1bmRlZmluZWQiLCJkIiwibWFpbiJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(pages-dir-node)/./components/Layout.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./components/ToastContext.tsx":
/*!*************************************!*\
  !*** ./components/ToastContext.tsx ***!
  \*************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   ToastProvider: () => (/* binding */ ToastProvider),\n/* harmony export */   useToast: () => (/* binding */ useToast)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var react_hot_toast__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! react-hot-toast */ \"react-hot-toast\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([react_hot_toast__WEBPACK_IMPORTED_MODULE_2__]);\nreact_hot_toast__WEBPACK_IMPORTED_MODULE_2__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\nconst ToastContext = /*#__PURE__*/ (0,react__WEBPACK_IMPORTED_MODULE_1__.createContext)({\n    success: (msg)=>{},\n    error: (msg)=>{},\n    info: (msg)=>{}\n});\nfunction ToastProvider({ children }) {\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(ToastContext.Provider, {\n        value: {\n            success: (msg)=>react_hot_toast__WEBPACK_IMPORTED_MODULE_2__[\"default\"].success(msg),\n            error: (msg)=>react_hot_toast__WEBPACK_IMPORTED_MODULE_2__[\"default\"].error(msg),\n            info: (msg)=>(0,react_hot_toast__WEBPACK_IMPORTED_MODULE_2__[\"default\"])(msg)\n        },\n        children: [\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(react_hot_toast__WEBPACK_IMPORTED_MODULE_2__.Toaster, {\n                position: \"top-right\",\n                toastOptions: {\n                    style: {\n                        fontFamily: 'Inter, sans-serif',\n                        fontSize: 15\n                    },\n                    success: {\n                        style: {\n                            background: '#0055A5',\n                            color: '#fff'\n                        }\n                    },\n                    error: {\n                        style: {\n                            background: '#FFC200',\n                            color: '#1F2D3D'\n                        }\n                    }\n                }\n            }, void 0, false, {\n                fileName: \"/Users/cpg/suitsync_full/frontend/components/ToastContext.tsx\",\n                lineNumber: 17,\n                columnNumber: 7\n            }, this),\n            children\n        ]\n    }, void 0, true, {\n        fileName: \"/Users/cpg/suitsync_full/frontend/components/ToastContext.tsx\",\n        lineNumber: 12,\n        columnNumber: 5\n    }, this);\n}\nfunction useToast() {\n    return (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(ToastContext);\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL2NvbXBvbmVudHMvVG9hc3RDb250ZXh0LnRzeCIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFrRDtBQUNEO0FBRWpELE1BQU1JLDZCQUFlSixvREFBYUEsQ0FBQztJQUNqQ0ssU0FBUyxDQUFDQyxPQUFpQjtJQUMzQkMsT0FBTyxDQUFDRCxPQUFpQjtJQUN6QkUsTUFBTSxDQUFDRixPQUFpQjtBQUMxQjtBQUVPLFNBQVNHLGNBQWMsRUFBRUMsUUFBUSxFQUFFO0lBQ3hDLHFCQUNFLDhEQUFDTixhQUFhTyxRQUFRO1FBQUNDLE9BQU87WUFDNUJQLFNBQVMsQ0FBQ0MsTUFBZ0JKLCtEQUFhLENBQUNJO1lBQ3hDQyxPQUFPLENBQUNELE1BQWdCSiw2REFBVyxDQUFDSTtZQUNwQ0UsTUFBTSxDQUFDRixNQUFnQkosMkRBQUtBLENBQUNJO1FBQy9COzswQkFDRSw4REFBQ0gsb0RBQU9BO2dCQUFDVSxVQUFTO2dCQUFZQyxjQUFjO29CQUMxQ0MsT0FBTzt3QkFBRUMsWUFBWTt3QkFBcUJDLFVBQVU7b0JBQUc7b0JBQ3ZEWixTQUFTO3dCQUFFVSxPQUFPOzRCQUFFRyxZQUFZOzRCQUFXQyxPQUFPO3dCQUFPO29CQUFFO29CQUMzRFosT0FBTzt3QkFBRVEsT0FBTzs0QkFBRUcsWUFBWTs0QkFBV0MsT0FBTzt3QkFBVTtvQkFBRTtnQkFDOUQ7Ozs7OztZQUNDVDs7Ozs7OztBQUdQO0FBRU8sU0FBU1U7SUFDZCxPQUFPbkIsaURBQVVBLENBQUNHO0FBQ3BCIiwic291cmNlcyI6WyIvVXNlcnMvY3BnL3N1aXRzeW5jX2Z1bGwvZnJvbnRlbmQvY29tcG9uZW50cy9Ub2FzdENvbnRleHQudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZUNvbnRleHQsIHVzZUNvbnRleHQgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgdG9hc3QsIHsgVG9hc3RlciB9IGZyb20gJ3JlYWN0LWhvdC10b2FzdCc7XG5cbmNvbnN0IFRvYXN0Q29udGV4dCA9IGNyZWF0ZUNvbnRleHQoe1xuICBzdWNjZXNzOiAobXNnOiBzdHJpbmcpID0+IHt9LFxuICBlcnJvcjogKG1zZzogc3RyaW5nKSA9PiB7fSxcbiAgaW5mbzogKG1zZzogc3RyaW5nKSA9PiB7fSxcbn0pO1xuXG5leHBvcnQgZnVuY3Rpb24gVG9hc3RQcm92aWRlcih7IGNoaWxkcmVuIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8VG9hc3RDb250ZXh0LlByb3ZpZGVyIHZhbHVlPXt7XG4gICAgICBzdWNjZXNzOiAobXNnOiBzdHJpbmcpID0+IHRvYXN0LnN1Y2Nlc3MobXNnKSxcbiAgICAgIGVycm9yOiAobXNnOiBzdHJpbmcpID0+IHRvYXN0LmVycm9yKG1zZyksXG4gICAgICBpbmZvOiAobXNnOiBzdHJpbmcpID0+IHRvYXN0KG1zZyksXG4gICAgfX0+XG4gICAgICA8VG9hc3RlciBwb3NpdGlvbj1cInRvcC1yaWdodFwiIHRvYXN0T3B0aW9ucz17e1xuICAgICAgICBzdHlsZTogeyBmb250RmFtaWx5OiAnSW50ZXIsIHNhbnMtc2VyaWYnLCBmb250U2l6ZTogMTUgfSxcbiAgICAgICAgc3VjY2VzczogeyBzdHlsZTogeyBiYWNrZ3JvdW5kOiAnIzAwNTVBNScsIGNvbG9yOiAnI2ZmZicgfSB9LFxuICAgICAgICBlcnJvcjogeyBzdHlsZTogeyBiYWNrZ3JvdW5kOiAnI0ZGQzIwMCcsIGNvbG9yOiAnIzFGMkQzRCcgfSB9LFxuICAgICAgfX0gLz5cbiAgICAgIHtjaGlsZHJlbn1cbiAgICA8L1RvYXN0Q29udGV4dC5Qcm92aWRlcj5cbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVzZVRvYXN0KCkge1xuICByZXR1cm4gdXNlQ29udGV4dChUb2FzdENvbnRleHQpO1xufSJdLCJuYW1lcyI6WyJjcmVhdGVDb250ZXh0IiwidXNlQ29udGV4dCIsInRvYXN0IiwiVG9hc3RlciIsIlRvYXN0Q29udGV4dCIsInN1Y2Nlc3MiLCJtc2ciLCJlcnJvciIsImluZm8iLCJUb2FzdFByb3ZpZGVyIiwiY2hpbGRyZW4iLCJQcm92aWRlciIsInZhbHVlIiwicG9zaXRpb24iLCJ0b2FzdE9wdGlvbnMiLCJzdHlsZSIsImZvbnRGYW1pbHkiLCJmb250U2l6ZSIsImJhY2tncm91bmQiLCJjb2xvciIsInVzZVRvYXN0Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(pages-dir-node)/./components/ToastContext.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?kind=PAGES&page=%2Fcommission&preferredRegion=&absolutePagePath=.%2Fpages%2Fcommission.tsx&absoluteAppPath=private-next-pages%2F_app&absoluteDocumentPath=private-next-pages%2F_document&middlewareConfigBase64=e30%3D!":
/*!*********************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?kind=PAGES&page=%2Fcommission&preferredRegion=&absolutePagePath=.%2Fpages%2Fcommission.tsx&absoluteAppPath=private-next-pages%2F_app&absoluteDocumentPath=private-next-pages%2F_document&middlewareConfigBase64=e30%3D! ***!
  \*********************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   config: () => (/* binding */ config),\n/* harmony export */   \"default\": () => (__WEBPACK_DEFAULT_EXPORT__),\n/* harmony export */   getServerSideProps: () => (/* binding */ getServerSideProps),\n/* harmony export */   getStaticPaths: () => (/* binding */ getStaticPaths),\n/* harmony export */   getStaticProps: () => (/* binding */ getStaticProps),\n/* harmony export */   reportWebVitals: () => (/* binding */ reportWebVitals),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   unstable_getServerProps: () => (/* binding */ unstable_getServerProps),\n/* harmony export */   unstable_getServerSideProps: () => (/* binding */ unstable_getServerSideProps),\n/* harmony export */   unstable_getStaticParams: () => (/* binding */ unstable_getStaticParams),\n/* harmony export */   unstable_getStaticPaths: () => (/* binding */ unstable_getStaticPaths),\n/* harmony export */   unstable_getStaticProps: () => (/* binding */ unstable_getStaticProps)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_pages_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/pages/module.compiled */ \"(pages-dir-node)/./node_modules/next/dist/server/route-modules/pages/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_pages_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_pages_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(pages-dir-node)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/build/templates/helpers */ \"(pages-dir-node)/./node_modules/next/dist/build/templates/helpers.js\");\n/* harmony import */ var private_next_pages_document__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! private-next-pages/_document */ \"(pages-dir-node)/./node_modules/next/dist/pages/_document.js\");\n/* harmony import */ var private_next_pages_document__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(private_next_pages_document__WEBPACK_IMPORTED_MODULE_3__);\n/* harmony import */ var private_next_pages_app__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! private-next-pages/_app */ \"(pages-dir-node)/./pages/_app.tsx\");\n/* harmony import */ var _pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./pages/commission.tsx */ \"(pages-dir-node)/./pages/commission.tsx\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([private_next_pages_app__WEBPACK_IMPORTED_MODULE_4__, _pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__]);\n([private_next_pages_app__WEBPACK_IMPORTED_MODULE_4__, _pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\n\n// Import the app and document modules.\n\n\n// Import the userland code.\n\n// Re-export the component (should be the default export).\n/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ((0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__.hoist)(_pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__, 'default'));\n// Re-export methods.\nconst getStaticProps = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__.hoist)(_pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__, 'getStaticProps');\nconst getStaticPaths = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__.hoist)(_pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__, 'getStaticPaths');\nconst getServerSideProps = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__.hoist)(_pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__, 'getServerSideProps');\nconst config = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__.hoist)(_pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__, 'config');\nconst reportWebVitals = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__.hoist)(_pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__, 'reportWebVitals');\n// Re-export legacy methods.\nconst unstable_getStaticProps = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__.hoist)(_pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__, 'unstable_getStaticProps');\nconst unstable_getStaticPaths = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__.hoist)(_pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__, 'unstable_getStaticPaths');\nconst unstable_getStaticParams = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__.hoist)(_pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__, 'unstable_getStaticParams');\nconst unstable_getServerProps = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__.hoist)(_pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__, 'unstable_getServerProps');\nconst unstable_getServerSideProps = (0,next_dist_build_templates_helpers__WEBPACK_IMPORTED_MODULE_2__.hoist)(_pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__, 'unstable_getServerSideProps');\n// Create and export the route module that will be consumed.\nconst routeModule = new next_dist_server_route_modules_pages_module_compiled__WEBPACK_IMPORTED_MODULE_0__.PagesRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.PAGES,\n        page: \"/commission\",\n        pathname: \"/commission\",\n        // The following aren't used in production.\n        bundlePath: '',\n        filename: ''\n    },\n    components: {\n        // default export might not exist when optimized for data only\n        App: private_next_pages_app__WEBPACK_IMPORTED_MODULE_4__[\"default\"],\n        Document: (private_next_pages_document__WEBPACK_IMPORTED_MODULE_3___default())\n    },\n    userland: _pages_commission_tsx__WEBPACK_IMPORTED_MODULE_5__\n});\n\n//# sourceMappingURL=pages.js.map\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL25vZGVfbW9kdWxlcy9uZXh0L2Rpc3QvYnVpbGQvd2VicGFjay9sb2FkZXJzL25leHQtcm91dGUtbG9hZGVyL2luZGV4LmpzP2tpbmQ9UEFHRVMmcGFnZT0lMkZjb21taXNzaW9uJnByZWZlcnJlZFJlZ2lvbj0mYWJzb2x1dGVQYWdlUGF0aD0uJTJGcGFnZXMlMkZjb21taXNzaW9uLnRzeCZhYnNvbHV0ZUFwcFBhdGg9cHJpdmF0ZS1uZXh0LXBhZ2VzJTJGX2FwcCZhYnNvbHV0ZURvY3VtZW50UGF0aD1wcml2YXRlLW5leHQtcGFnZXMlMkZfZG9jdW1lbnQmbWlkZGxld2FyZUNvbmZpZ0Jhc2U2ND1lMzAlM0QhIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQXdGO0FBQ2hDO0FBQ0U7QUFDMUQ7QUFDeUQ7QUFDVjtBQUMvQztBQUNtRDtBQUNuRDtBQUNBLGlFQUFlLHdFQUFLLENBQUMsa0RBQVEsWUFBWSxFQUFDO0FBQzFDO0FBQ08sdUJBQXVCLHdFQUFLLENBQUMsa0RBQVE7QUFDckMsdUJBQXVCLHdFQUFLLENBQUMsa0RBQVE7QUFDckMsMkJBQTJCLHdFQUFLLENBQUMsa0RBQVE7QUFDekMsZUFBZSx3RUFBSyxDQUFDLGtEQUFRO0FBQzdCLHdCQUF3Qix3RUFBSyxDQUFDLGtEQUFRO0FBQzdDO0FBQ08sZ0NBQWdDLHdFQUFLLENBQUMsa0RBQVE7QUFDOUMsZ0NBQWdDLHdFQUFLLENBQUMsa0RBQVE7QUFDOUMsaUNBQWlDLHdFQUFLLENBQUMsa0RBQVE7QUFDL0MsZ0NBQWdDLHdFQUFLLENBQUMsa0RBQVE7QUFDOUMsb0NBQW9DLHdFQUFLLENBQUMsa0RBQVE7QUFDekQ7QUFDTyx3QkFBd0Isa0dBQWdCO0FBQy9DO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQSxhQUFhLDhEQUFXO0FBQ3hCLGtCQUFrQixvRUFBZ0I7QUFDbEMsS0FBSztBQUNMLFlBQVk7QUFDWixDQUFDOztBQUVELGlDIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGFnZXNSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvcGFnZXMvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBob2lzdCB9IGZyb20gXCJuZXh0L2Rpc3QvYnVpbGQvdGVtcGxhdGVzL2hlbHBlcnNcIjtcbi8vIEltcG9ydCB0aGUgYXBwIGFuZCBkb2N1bWVudCBtb2R1bGVzLlxuaW1wb3J0ICogYXMgZG9jdW1lbnQgZnJvbSBcInByaXZhdGUtbmV4dC1wYWdlcy9fZG9jdW1lbnRcIjtcbmltcG9ydCAqIGFzIGFwcCBmcm9tIFwicHJpdmF0ZS1uZXh0LXBhZ2VzL19hcHBcIjtcbi8vIEltcG9ydCB0aGUgdXNlcmxhbmQgY29kZS5cbmltcG9ydCAqIGFzIHVzZXJsYW5kIGZyb20gXCIuL3BhZ2VzL2NvbW1pc3Npb24udHN4XCI7XG4vLyBSZS1leHBvcnQgdGhlIGNvbXBvbmVudCAoc2hvdWxkIGJlIHRoZSBkZWZhdWx0IGV4cG9ydCkuXG5leHBvcnQgZGVmYXVsdCBob2lzdCh1c2VybGFuZCwgJ2RlZmF1bHQnKTtcbi8vIFJlLWV4cG9ydCBtZXRob2RzLlxuZXhwb3J0IGNvbnN0IGdldFN0YXRpY1Byb3BzID0gaG9pc3QodXNlcmxhbmQsICdnZXRTdGF0aWNQcm9wcycpO1xuZXhwb3J0IGNvbnN0IGdldFN0YXRpY1BhdGhzID0gaG9pc3QodXNlcmxhbmQsICdnZXRTdGF0aWNQYXRocycpO1xuZXhwb3J0IGNvbnN0IGdldFNlcnZlclNpZGVQcm9wcyA9IGhvaXN0KHVzZXJsYW5kLCAnZ2V0U2VydmVyU2lkZVByb3BzJyk7XG5leHBvcnQgY29uc3QgY29uZmlnID0gaG9pc3QodXNlcmxhbmQsICdjb25maWcnKTtcbmV4cG9ydCBjb25zdCByZXBvcnRXZWJWaXRhbHMgPSBob2lzdCh1c2VybGFuZCwgJ3JlcG9ydFdlYlZpdGFscycpO1xuLy8gUmUtZXhwb3J0IGxlZ2FjeSBtZXRob2RzLlxuZXhwb3J0IGNvbnN0IHVuc3RhYmxlX2dldFN0YXRpY1Byb3BzID0gaG9pc3QodXNlcmxhbmQsICd1bnN0YWJsZV9nZXRTdGF0aWNQcm9wcycpO1xuZXhwb3J0IGNvbnN0IHVuc3RhYmxlX2dldFN0YXRpY1BhdGhzID0gaG9pc3QodXNlcmxhbmQsICd1bnN0YWJsZV9nZXRTdGF0aWNQYXRocycpO1xuZXhwb3J0IGNvbnN0IHVuc3RhYmxlX2dldFN0YXRpY1BhcmFtcyA9IGhvaXN0KHVzZXJsYW5kLCAndW5zdGFibGVfZ2V0U3RhdGljUGFyYW1zJyk7XG5leHBvcnQgY29uc3QgdW5zdGFibGVfZ2V0U2VydmVyUHJvcHMgPSBob2lzdCh1c2VybGFuZCwgJ3Vuc3RhYmxlX2dldFNlcnZlclByb3BzJyk7XG5leHBvcnQgY29uc3QgdW5zdGFibGVfZ2V0U2VydmVyU2lkZVByb3BzID0gaG9pc3QodXNlcmxhbmQsICd1bnN0YWJsZV9nZXRTZXJ2ZXJTaWRlUHJvcHMnKTtcbi8vIENyZWF0ZSBhbmQgZXhwb3J0IHRoZSByb3V0ZSBtb2R1bGUgdGhhdCB3aWxsIGJlIGNvbnN1bWVkLlxuZXhwb3J0IGNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IFBhZ2VzUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLlBBR0VTLFxuICAgICAgICBwYWdlOiBcIi9jb21taXNzaW9uXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9jb21taXNzaW9uXCIsXG4gICAgICAgIC8vIFRoZSBmb2xsb3dpbmcgYXJlbid0IHVzZWQgaW4gcHJvZHVjdGlvbi5cbiAgICAgICAgYnVuZGxlUGF0aDogJycsXG4gICAgICAgIGZpbGVuYW1lOiAnJ1xuICAgIH0sXG4gICAgY29tcG9uZW50czoge1xuICAgICAgICAvLyBkZWZhdWx0IGV4cG9ydCBtaWdodCBub3QgZXhpc3Qgd2hlbiBvcHRpbWl6ZWQgZm9yIGRhdGEgb25seVxuICAgICAgICBBcHA6IGFwcC5kZWZhdWx0LFxuICAgICAgICBEb2N1bWVudDogZG9jdW1lbnQuZGVmYXVsdFxuICAgIH0sXG4gICAgdXNlcmxhbmRcbn0pO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1wYWdlcy5qcy5tYXAiXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(pages-dir-node)/./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?kind=PAGES&page=%2Fcommission&preferredRegion=&absolutePagePath=.%2Fpages%2Fcommission.tsx&absoluteAppPath=private-next-pages%2F_app&absoluteDocumentPath=private-next-pages%2F_document&middlewareConfigBase64=e30%3D!\n");

/***/ }),

/***/ "(pages-dir-node)/./pages/_app.tsx":
/*!************************!*\
  !*** ./pages/_app.tsx ***!
  \************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ App)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../styles/globals.css */ \"(pages-dir-node)/./styles/globals.css\");\n/* harmony import */ var _styles_globals_css__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_styles_globals_css__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _src_AuthContext__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../src/AuthContext */ \"(pages-dir-node)/./src/AuthContext.tsx\");\n/* harmony import */ var _components_ToastContext__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../components/ToastContext */ \"(pages-dir-node)/./components/ToastContext.tsx\");\n/* harmony import */ var _components_Layout__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../components/Layout */ \"(pages-dir-node)/./components/Layout.tsx\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_src_AuthContext__WEBPACK_IMPORTED_MODULE_2__, _components_ToastContext__WEBPACK_IMPORTED_MODULE_3__]);\n([_src_AuthContext__WEBPACK_IMPORTED_MODULE_2__, _components_ToastContext__WEBPACK_IMPORTED_MODULE_3__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n// frontend/pages/_app.tsx\n\n\n\n\n\nfunction App({ Component, pageProps }) {\n    // Support per-page layout: if a page exports getLayout, use it; otherwise, wrap in Layout\n    const getLayout = Component.getLayout || ((page)=>/*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_Layout__WEBPACK_IMPORTED_MODULE_4__[\"default\"], {\n            children: page\n        }, void 0, false, {\n            fileName: \"/Users/cpg/suitsync_full/frontend/pages/_app.tsx\",\n            lineNumber: 10,\n            columnNumber: 81\n        }, this));\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_src_AuthContext__WEBPACK_IMPORTED_MODULE_2__.AuthProvider, {\n        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_components_ToastContext__WEBPACK_IMPORTED_MODULE_3__.ToastProvider, {\n            children: getLayout(/*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(Component, {\n                ...pageProps\n            }, void 0, false, {\n                fileName: \"/Users/cpg/suitsync_full/frontend/pages/_app.tsx\",\n                lineNumber: 14,\n                columnNumber: 20\n            }, this))\n        }, void 0, false, {\n            fileName: \"/Users/cpg/suitsync_full/frontend/pages/_app.tsx\",\n            lineNumber: 13,\n            columnNumber: 7\n        }, this)\n    }, void 0, false, {\n        fileName: \"/Users/cpg/suitsync_full/frontend/pages/_app.tsx\",\n        lineNumber: 12,\n        columnNumber: 5\n    }, this);\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3BhZ2VzL19hcHAudHN4IiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMEJBQTBCOztBQUNLO0FBRW1CO0FBQ1M7QUFDakI7QUFFM0IsU0FBU0csSUFBSSxFQUFFQyxTQUFTLEVBQUVDLFNBQVMsRUFBWTtJQUM1RCwwRkFBMEY7SUFDMUYsTUFBTUMsWUFBWSxVQUFtQkEsU0FBUyxJQUFLLEVBQUNDLHFCQUEwQiw4REFBQ0wsMERBQU1BO3NCQUFFSzs7Ozs7Z0JBQWE7SUFDcEcscUJBQ0UsOERBQUNQLDBEQUFZQTtrQkFDWCw0RUFBQ0MsbUVBQWFBO3NCQUNYSyx3QkFBVSw4REFBQ0Y7Z0JBQVcsR0FBR0MsU0FBUzs7Ozs7Ozs7Ozs7Ozs7OztBQUkzQyIsInNvdXJjZXMiOlsiL1VzZXJzL2NwZy9zdWl0c3luY19mdWxsL2Zyb250ZW5kL3BhZ2VzL19hcHAudHN4Il0sInNvdXJjZXNDb250ZW50IjpbIi8vIGZyb250ZW5kL3BhZ2VzL19hcHAudHN4XG5pbXBvcnQgJy4uL3N0eWxlcy9nbG9iYWxzLmNzcyc7XG5pbXBvcnQgdHlwZSB7IEFwcFByb3BzIH0gZnJvbSAnbmV4dC9hcHAnO1xuaW1wb3J0IHsgQXV0aFByb3ZpZGVyIH0gZnJvbSAnLi4vc3JjL0F1dGhDb250ZXh0JztcbmltcG9ydCB7IFRvYXN0UHJvdmlkZXIgfSBmcm9tICcuLi9jb21wb25lbnRzL1RvYXN0Q29udGV4dCc7XG5pbXBvcnQgTGF5b3V0IGZyb20gJy4uL2NvbXBvbmVudHMvTGF5b3V0JztcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gQXBwKHsgQ29tcG9uZW50LCBwYWdlUHJvcHMgfTogQXBwUHJvcHMpIHtcbiAgLy8gU3VwcG9ydCBwZXItcGFnZSBsYXlvdXQ6IGlmIGEgcGFnZSBleHBvcnRzIGdldExheW91dCwgdXNlIGl0OyBvdGhlcndpc2UsIHdyYXAgaW4gTGF5b3V0XG4gIGNvbnN0IGdldExheW91dCA9IChDb21wb25lbnQgYXMgYW55KS5nZXRMYXlvdXQgfHwgKChwYWdlOiBSZWFjdC5SZWFjdE5vZGUpID0+IDxMYXlvdXQ+e3BhZ2V9PC9MYXlvdXQ+KTtcbiAgcmV0dXJuIChcbiAgICA8QXV0aFByb3ZpZGVyPlxuICAgICAgPFRvYXN0UHJvdmlkZXI+XG4gICAgICAgIHtnZXRMYXlvdXQoPENvbXBvbmVudCB7Li4ucGFnZVByb3BzfSAvPil9XG4gICAgICA8L1RvYXN0UHJvdmlkZXI+XG4gICAgPC9BdXRoUHJvdmlkZXI+XG4gICk7XG59Il0sIm5hbWVzIjpbIkF1dGhQcm92aWRlciIsIlRvYXN0UHJvdmlkZXIiLCJMYXlvdXQiLCJBcHAiLCJDb21wb25lbnQiLCJwYWdlUHJvcHMiLCJnZXRMYXlvdXQiLCJwYWdlIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(pages-dir-node)/./pages/_app.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./pages/commission.tsx":
/*!******************************!*\
  !*** ./pages/commission.tsx ***!
  \******************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ CommissionLeaderboard)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _barrel_optimize_names_Bar_BarChart_ResponsiveContainer_Tooltip_XAxis_YAxis_recharts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! __barrel_optimize__?names=Bar,BarChart,ResponsiveContainer,Tooltip,XAxis,YAxis!=!recharts */ \"(pages-dir-node)/__barrel_optimize__?names=Bar,BarChart,ResponsiveContainer,Tooltip,XAxis,YAxis!=!./node_modules/recharts/es6/index.js\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_barrel_optimize_names_Bar_BarChart_ResponsiveContainer_Tooltip_XAxis_YAxis_recharts__WEBPACK_IMPORTED_MODULE_2__]);\n_barrel_optimize_names_Bar_BarChart_ResponsiveContainer_Tooltip_XAxis_YAxis_recharts__WEBPACK_IMPORTED_MODULE_2__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\nfunction CommissionLeaderboard() {\n    const [data, setData] = (0,react__WEBPACK_IMPORTED_MODULE_1__.useState)([]);\n    (0,react__WEBPACK_IMPORTED_MODULE_1__.useEffect)({\n        \"CommissionLeaderboard.useEffect\": ()=>{\n            fetch('/api/commissions/leaderboard').then({\n                \"CommissionLeaderboard.useEffect\": (res)=>res.json()\n            }[\"CommissionLeaderboard.useEffect\"]).then(setData);\n        }\n    }[\"CommissionLeaderboard.useEffect\"], []);\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n        className: \"max-w-2xl mx-auto p-6\",\n        children: [\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"h1\", {\n                className: \"text-3xl font-bold mb-4 text-primary dark:text-accent\",\n                children: \"Commission Leaderboard\"\n            }, void 0, false, {\n                fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                lineNumber: 14,\n                columnNumber: 7\n            }, this),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"table\", {\n                className: \"w-full mb-8 border rounded bg-white dark:bg-gray-900 text-black dark:text-white\",\n                children: [\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"thead\", {\n                        children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"tr\", {\n                            className: \"bg-gray-100 dark:bg-gray-800 text-gray-dark dark:text-gray-light\",\n                            children: [\n                                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"th\", {\n                                    className: \"p-2 text-left\",\n                                    children: \"Associate\"\n                                }, void 0, false, {\n                                    fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                                    lineNumber: 18,\n                                    columnNumber: 13\n                                }, this),\n                                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"th\", {\n                                    className: \"p-2 text-left\",\n                                    children: \"Email\"\n                                }, void 0, false, {\n                                    fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                                    lineNumber: 19,\n                                    columnNumber: 13\n                                }, this),\n                                /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"th\", {\n                                    className: \"p-2 text-left\",\n                                    children: \"Total Commission\"\n                                }, void 0, false, {\n                                    fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                                    lineNumber: 20,\n                                    columnNumber: 13\n                                }, this)\n                            ]\n                        }, void 0, true, {\n                            fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                            lineNumber: 17,\n                            columnNumber: 11\n                        }, this)\n                    }, void 0, false, {\n                        fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                        lineNumber: 16,\n                        columnNumber: 9\n                    }, this),\n                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"tbody\", {\n                        children: data.map((row, i)=>/*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"tr\", {\n                                className: \"border-t\",\n                                children: [\n                                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"td\", {\n                                        className: \"p-2\",\n                                        children: row.associate?.name\n                                    }, void 0, false, {\n                                        fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                                        lineNumber: 26,\n                                        columnNumber: 15\n                                    }, this),\n                                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"td\", {\n                                        className: \"p-2\",\n                                        children: row.associate?.email\n                                    }, void 0, false, {\n                                        fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                                        lineNumber: 27,\n                                        columnNumber: 15\n                                    }, this),\n                                    /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"td\", {\n                                        className: \"p-2\",\n                                        children: [\n                                            \"$\",\n                                            row.totalCommission?.toFixed(2)\n                                        ]\n                                    }, void 0, true, {\n                                        fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                                        lineNumber: 28,\n                                        columnNumber: 15\n                                    }, this)\n                                ]\n                            }, i, true, {\n                                fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                                lineNumber: 25,\n                                columnNumber: 13\n                            }, this))\n                    }, void 0, false, {\n                        fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                        lineNumber: 23,\n                        columnNumber: 9\n                    }, this)\n                ]\n            }, void 0, true, {\n                fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                lineNumber: 15,\n                columnNumber: 7\n            }, this),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"h2\", {\n                className: \"text-xl font-semibold mb-2 text-primary dark:text-accent\",\n                children: \"Bar Chart\"\n            }, void 0, false, {\n                fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                lineNumber: 33,\n                columnNumber: 7\n            }, this),\n            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(\"div\", {\n                className: \"bg-white dark:bg-gray-900 p-4 rounded shadow\",\n                children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_Bar_BarChart_ResponsiveContainer_Tooltip_XAxis_YAxis_recharts__WEBPACK_IMPORTED_MODULE_2__.ResponsiveContainer, {\n                    width: \"100%\",\n                    height: 300,\n                    children: /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_Bar_BarChart_ResponsiveContainer_Tooltip_XAxis_YAxis_recharts__WEBPACK_IMPORTED_MODULE_2__.BarChart, {\n                        data: data.map((row)=>({\n                                name: row.associate?.name,\n                                commission: row.totalCommission\n                            })),\n                        children: [\n                            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_Bar_BarChart_ResponsiveContainer_Tooltip_XAxis_YAxis_recharts__WEBPACK_IMPORTED_MODULE_2__.XAxis, {\n                                dataKey: \"name\",\n                                stroke: \"#8884d8\"\n                            }, void 0, false, {\n                                fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                                lineNumber: 37,\n                                columnNumber: 13\n                            }, this),\n                            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_Bar_BarChart_ResponsiveContainer_Tooltip_XAxis_YAxis_recharts__WEBPACK_IMPORTED_MODULE_2__.YAxis, {}, void 0, false, {\n                                fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                                lineNumber: 38,\n                                columnNumber: 13\n                            }, this),\n                            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_Bar_BarChart_ResponsiveContainer_Tooltip_XAxis_YAxis_recharts__WEBPACK_IMPORTED_MODULE_2__.Tooltip, {}, void 0, false, {\n                                fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                                lineNumber: 39,\n                                columnNumber: 13\n                            }, this),\n                            /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(_barrel_optimize_names_Bar_BarChart_ResponsiveContainer_Tooltip_XAxis_YAxis_recharts__WEBPACK_IMPORTED_MODULE_2__.Bar, {\n                                dataKey: \"commission\",\n                                fill: \"#0055A5\"\n                            }, void 0, false, {\n                                fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                                lineNumber: 40,\n                                columnNumber: 13\n                            }, this)\n                        ]\n                    }, void 0, true, {\n                        fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                        lineNumber: 36,\n                        columnNumber: 11\n                    }, this)\n                }, void 0, false, {\n                    fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                    lineNumber: 35,\n                    columnNumber: 9\n                }, this)\n            }, void 0, false, {\n                fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n                lineNumber: 34,\n                columnNumber: 7\n            }, this)\n        ]\n    }, void 0, true, {\n        fileName: \"/Users/cpg/suitsync_full/frontend/pages/commission.tsx\",\n        lineNumber: 13,\n        columnNumber: 5\n    }, this);\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3BhZ2VzL2NvbW1pc3Npb24udHN4IiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBNEM7QUFDeUM7QUFFdEUsU0FBU1E7SUFDdEIsTUFBTSxDQUFDQyxNQUFNQyxRQUFRLEdBQUdULCtDQUFRQSxDQUFDLEVBQUU7SUFDbkNELGdEQUFTQTsyQ0FBQztZQUNSVyxNQUFNLGdDQUNIQyxJQUFJO21EQUFDQyxDQUFBQSxNQUFPQSxJQUFJQyxJQUFJO2tEQUNwQkYsSUFBSSxDQUFDRjtRQUNWOzBDQUFHLEVBQUU7SUFFTCxxQkFDRSw4REFBQ0s7UUFBSUMsV0FBVTs7MEJBQ2IsOERBQUNDO2dCQUFHRCxXQUFVOzBCQUF3RDs7Ozs7OzBCQUN0RSw4REFBQ0U7Z0JBQU1GLFdBQVU7O2tDQUNmLDhEQUFDRztrQ0FDQyw0RUFBQ0M7NEJBQUdKLFdBQVU7OzhDQUNaLDhEQUFDSztvQ0FBR0wsV0FBVTs4Q0FBZ0I7Ozs7Ozs4Q0FDOUIsOERBQUNLO29DQUFHTCxXQUFVOzhDQUFnQjs7Ozs7OzhDQUM5Qiw4REFBQ0s7b0NBQUdMLFdBQVU7OENBQWdCOzs7Ozs7Ozs7Ozs7Ozs7OztrQ0FHbEMsOERBQUNNO2tDQUNFYixLQUFLYyxHQUFHLENBQUMsQ0FBQ0MsS0FBS0Msa0JBQ2QsOERBQUNMO2dDQUFXSixXQUFVOztrREFDcEIsOERBQUNVO3dDQUFHVixXQUFVO2tEQUFPUSxJQUFJRyxTQUFTLEVBQUVDOzs7Ozs7a0RBQ3BDLDhEQUFDRjt3Q0FBR1YsV0FBVTtrREFBT1EsSUFBSUcsU0FBUyxFQUFFRTs7Ozs7O2tEQUNwQyw4REFBQ0g7d0NBQUdWLFdBQVU7OzRDQUFNOzRDQUFFUSxJQUFJTSxlQUFlLEVBQUVDLFFBQVE7Ozs7Ozs7OytCQUg1Q047Ozs7Ozs7Ozs7Ozs7Ozs7MEJBUWYsOERBQUNPO2dCQUFHaEIsV0FBVTswQkFBMkQ7Ozs7OzswQkFDekUsOERBQUNEO2dCQUFJQyxXQUFVOzBCQUNiLDRFQUFDVCxxSUFBbUJBO29CQUFDMEIsT0FBTTtvQkFBT0MsUUFBUTs4QkFDeEMsNEVBQUNoQywwSEFBUUE7d0JBQUNPLE1BQU1BLEtBQUtjLEdBQUcsQ0FBQ0MsQ0FBQUEsTUFBUTtnQ0FBRUksTUFBTUosSUFBSUcsU0FBUyxFQUFFQztnQ0FBTU8sWUFBWVgsSUFBSU0sZUFBZTs0QkFBQzs7MENBQzVGLDhEQUFDMUIsdUhBQUtBO2dDQUFDZ0MsU0FBUTtnQ0FBT0MsUUFBTzs7Ozs7OzBDQUM3Qiw4REFBQ2hDLHVIQUFLQTs7Ozs7MENBQ04sOERBQUNDLHlIQUFPQTs7Ozs7MENBQ1IsOERBQUNILHFIQUFHQTtnQ0FBQ2lDLFNBQVE7Z0NBQWFFLE1BQUs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFNM0MiLCJzb3VyY2VzIjpbIi9Vc2Vycy9jcGcvc3VpdHN5bmNfZnVsbC9mcm9udGVuZC9wYWdlcy9jb21taXNzaW9uLnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VFZmZlY3QsIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgQmFyQ2hhcnQsIEJhciwgWEF4aXMsIFlBeGlzLCBUb29sdGlwLCBSZXNwb25zaXZlQ29udGFpbmVyIH0gZnJvbSAncmVjaGFydHMnO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBDb21taXNzaW9uTGVhZGVyYm9hcmQoKSB7XG4gIGNvbnN0IFtkYXRhLCBzZXREYXRhXSA9IHVzZVN0YXRlKFtdKTtcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBmZXRjaCgnL2FwaS9jb21taXNzaW9ucy9sZWFkZXJib2FyZCcpXG4gICAgICAudGhlbihyZXMgPT4gcmVzLmpzb24oKSlcbiAgICAgIC50aGVuKHNldERhdGEpO1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTJ4bCBteC1hdXRvIHAtNlwiPlxuICAgICAgPGgxIGNsYXNzTmFtZT1cInRleHQtM3hsIGZvbnQtYm9sZCBtYi00IHRleHQtcHJpbWFyeSBkYXJrOnRleHQtYWNjZW50XCI+Q29tbWlzc2lvbiBMZWFkZXJib2FyZDwvaDE+XG4gICAgICA8dGFibGUgY2xhc3NOYW1lPVwidy1mdWxsIG1iLTggYm9yZGVyIHJvdW5kZWQgYmctd2hpdGUgZGFyazpiZy1ncmF5LTkwMCB0ZXh0LWJsYWNrIGRhcms6dGV4dC13aGl0ZVwiPlxuICAgICAgICA8dGhlYWQ+XG4gICAgICAgICAgPHRyIGNsYXNzTmFtZT1cImJnLWdyYXktMTAwIGRhcms6YmctZ3JheS04MDAgdGV4dC1ncmF5LWRhcmsgZGFyazp0ZXh0LWdyYXktbGlnaHRcIj5cbiAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJwLTIgdGV4dC1sZWZ0XCI+QXNzb2NpYXRlPC90aD5cbiAgICAgICAgICAgIDx0aCBjbGFzc05hbWU9XCJwLTIgdGV4dC1sZWZ0XCI+RW1haWw8L3RoPlxuICAgICAgICAgICAgPHRoIGNsYXNzTmFtZT1cInAtMiB0ZXh0LWxlZnRcIj5Ub3RhbCBDb21taXNzaW9uPC90aD5cbiAgICAgICAgICA8L3RyPlxuICAgICAgICA8L3RoZWFkPlxuICAgICAgICA8dGJvZHk+XG4gICAgICAgICAge2RhdGEubWFwKChyb3csIGkpID0+IChcbiAgICAgICAgICAgIDx0ciBrZXk9e2l9IGNsYXNzTmFtZT1cImJvcmRlci10XCI+XG4gICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJwLTJcIj57cm93LmFzc29jaWF0ZT8ubmFtZX08L3RkPlxuICAgICAgICAgICAgICA8dGQgY2xhc3NOYW1lPVwicC0yXCI+e3Jvdy5hc3NvY2lhdGU/LmVtYWlsfTwvdGQ+XG4gICAgICAgICAgICAgIDx0ZCBjbGFzc05hbWU9XCJwLTJcIj4ke3Jvdy50b3RhbENvbW1pc3Npb24/LnRvRml4ZWQoMil9PC90ZD5cbiAgICAgICAgICAgIDwvdHI+XG4gICAgICAgICAgKSl9XG4gICAgICAgIDwvdGJvZHk+XG4gICAgICA8L3RhYmxlPlxuICAgICAgPGgyIGNsYXNzTmFtZT1cInRleHQteGwgZm9udC1zZW1pYm9sZCBtYi0yIHRleHQtcHJpbWFyeSBkYXJrOnRleHQtYWNjZW50XCI+QmFyIENoYXJ0PC9oMj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwiYmctd2hpdGUgZGFyazpiZy1ncmF5LTkwMCBwLTQgcm91bmRlZCBzaGFkb3dcIj5cbiAgICAgICAgPFJlc3BvbnNpdmVDb250YWluZXIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PXszMDB9PlxuICAgICAgICAgIDxCYXJDaGFydCBkYXRhPXtkYXRhLm1hcChyb3cgPT4gKHsgbmFtZTogcm93LmFzc29jaWF0ZT8ubmFtZSwgY29tbWlzc2lvbjogcm93LnRvdGFsQ29tbWlzc2lvbiB9KSl9PlxuICAgICAgICAgICAgPFhBeGlzIGRhdGFLZXk9XCJuYW1lXCIgc3Ryb2tlPVwiIzg4ODRkOFwiIC8+XG4gICAgICAgICAgICA8WUF4aXMgLz5cbiAgICAgICAgICAgIDxUb29sdGlwIC8+XG4gICAgICAgICAgICA8QmFyIGRhdGFLZXk9XCJjb21taXNzaW9uXCIgZmlsbD1cIiMwMDU1QTVcIiAvPlxuICAgICAgICAgIDwvQmFyQ2hhcnQ+XG4gICAgICAgIDwvUmVzcG9uc2l2ZUNvbnRhaW5lcj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufSAiXSwibmFtZXMiOlsidXNlRWZmZWN0IiwidXNlU3RhdGUiLCJCYXJDaGFydCIsIkJhciIsIlhBeGlzIiwiWUF4aXMiLCJUb29sdGlwIiwiUmVzcG9uc2l2ZUNvbnRhaW5lciIsIkNvbW1pc3Npb25MZWFkZXJib2FyZCIsImRhdGEiLCJzZXREYXRhIiwiZmV0Y2giLCJ0aGVuIiwicmVzIiwianNvbiIsImRpdiIsImNsYXNzTmFtZSIsImgxIiwidGFibGUiLCJ0aGVhZCIsInRyIiwidGgiLCJ0Ym9keSIsIm1hcCIsInJvdyIsImkiLCJ0ZCIsImFzc29jaWF0ZSIsIm5hbWUiLCJlbWFpbCIsInRvdGFsQ29tbWlzc2lvbiIsInRvRml4ZWQiLCJoMiIsIndpZHRoIiwiaGVpZ2h0IiwiY29tbWlzc2lvbiIsImRhdGFLZXkiLCJzdHJva2UiLCJmaWxsIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(pages-dir-node)/./pages/commission.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./src/AuthContext.tsx":
/*!*****************************!*\
  !*** ./src/AuthContext.tsx ***!
  \*****************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   AuthProvider: () => (/* binding */ AuthProvider),\n/* harmony export */   useAuth: () => (/* binding */ useAuth)\n/* harmony export */ });\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react/jsx-dev-runtime */ \"react/jsx-dev-runtime\");\n/* harmony import */ var react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react */ \"react\");\n/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var swr__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! swr */ \"swr\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([swr__WEBPACK_IMPORTED_MODULE_2__]);\nswr__WEBPACK_IMPORTED_MODULE_2__ = (__webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__)[0];\n\n\n\nconst AuthContext = /*#__PURE__*/ (0,react__WEBPACK_IMPORTED_MODULE_1__.createContext)({\n    user: null,\n    loading: false,\n    login: async ()=>{},\n    logout: async ()=>{}\n});\nconst fetcher = (url)=>fetch(url, {\n        credentials: 'include'\n    }).then((r)=>r.ok ? r.json() : null);\nfunction AuthProvider({ children }) {\n    const { data: user, mutate, isLoading } = (0,swr__WEBPACK_IMPORTED_MODULE_2__[\"default\"])('/api/auth/session', fetcher);\n    async function login(email, password) {\n        const res = await fetch('/api/auth/login', {\n            method: 'POST',\n            headers: {\n                'Content-Type': 'application/json'\n            },\n            credentials: 'include',\n            body: JSON.stringify({\n                email,\n                password\n            })\n        });\n        if (!res.ok) throw new Error('Invalid credentials');\n        await mutate();\n    }\n    async function logout() {\n        await fetch('/api/auth/logout', {\n            method: 'POST',\n            credentials: 'include'\n        });\n        await mutate(null);\n    }\n    return /*#__PURE__*/ (0,react_jsx_dev_runtime__WEBPACK_IMPORTED_MODULE_0__.jsxDEV)(AuthContext.Provider, {\n        value: {\n            user,\n            loading: isLoading,\n            login,\n            logout\n        },\n        children: children\n    }, void 0, false, {\n        fileName: \"/Users/cpg/suitsync_full/frontend/src/AuthContext.tsx\",\n        lineNumber: 47,\n        columnNumber: 5\n    }, this);\n}\nfunction useAuth() {\n    return (0,react__WEBPACK_IMPORTED_MODULE_1__.useContext)(AuthContext);\n}\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS8uL3NyYy9BdXRoQ29udGV4dC50c3giLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBeUY7QUFDaEU7QUFnQnpCLE1BQU1JLDRCQUFjSCxvREFBYUEsQ0FBa0I7SUFDakRJLE1BQU07SUFDTkMsU0FBUztJQUNUQyxPQUFPLFdBQWE7SUFDcEJDLFFBQVEsV0FBYTtBQUN2QjtBQUVBLE1BQU1DLFVBQVUsQ0FBQ0MsTUFBZ0JDLE1BQU1ELEtBQUs7UUFBRUUsYUFBYTtJQUFVLEdBQUdDLElBQUksQ0FBQ0MsQ0FBQUEsSUFBS0EsRUFBRUMsRUFBRSxHQUFHRCxFQUFFRSxJQUFJLEtBQUs7QUFFN0YsU0FBU0MsYUFBYSxFQUFFQyxRQUFRLEVBQTJCO0lBQ2hFLE1BQU0sRUFBRUMsTUFBTWQsSUFBSSxFQUFFZSxNQUFNLEVBQUVDLFNBQVMsRUFBRSxHQUFHbEIsK0NBQU1BLENBQWMscUJBQXFCTTtJQUVuRixlQUFlRixNQUFNZSxLQUFhLEVBQUVDLFFBQWdCO1FBQ2xELE1BQU1DLE1BQU0sTUFBTWIsTUFBTSxtQkFBbUI7WUFDekNjLFFBQVE7WUFDUkMsU0FBUztnQkFBRSxnQkFBZ0I7WUFBbUI7WUFDOUNkLGFBQWE7WUFDYmUsTUFBTUMsS0FBS0MsU0FBUyxDQUFDO2dCQUFFUDtnQkFBT0M7WUFBUztRQUN6QztRQUNBLElBQUksQ0FBQ0MsSUFBSVQsRUFBRSxFQUFFLE1BQU0sSUFBSWUsTUFBTTtRQUM3QixNQUFNVjtJQUNSO0lBRUEsZUFBZVo7UUFDYixNQUFNRyxNQUFNLG9CQUFvQjtZQUFFYyxRQUFRO1lBQVFiLGFBQWE7UUFBVTtRQUN6RSxNQUFNUSxPQUFPO0lBQ2Y7SUFFQSxxQkFDRSw4REFBQ2hCLFlBQVkyQixRQUFRO1FBQUNDLE9BQU87WUFBRTNCO1lBQU1DLFNBQVNlO1lBQVdkO1lBQU9DO1FBQU87a0JBQ3BFVTs7Ozs7O0FBR1A7QUFFTyxTQUFTZTtJQUNkLE9BQU8vQixpREFBVUEsQ0FBQ0U7QUFDcEIiLCJzb3VyY2VzIjpbIi9Vc2Vycy9jcGcvc3VpdHN5bmNfZnVsbC9mcm9udGVuZC9zcmMvQXV0aENvbnRleHQudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCwgeyBjcmVhdGVDb250ZXh0LCB1c2VDb250ZXh0LCB1c2VTdGF0ZSwgdXNlRWZmZWN0LCBSZWFjdE5vZGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgdXNlU1dSIGZyb20gJ3N3cic7XG5cbmludGVyZmFjZSBVc2VyIHtcbiAgaWQ6IG51bWJlcjtcbiAgZW1haWw6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICByb2xlOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBBdXRoQ29udGV4dFR5cGUge1xuICB1c2VyOiBVc2VyIHwgbnVsbDtcbiAgbG9hZGluZzogYm9vbGVhbjtcbiAgbG9naW46IChlbWFpbDogc3RyaW5nLCBwYXNzd29yZDogc3RyaW5nKSA9PiBQcm9taXNlPHZvaWQ+O1xuICBsb2dvdXQ6ICgpID0+IFByb21pc2U8dm9pZD47XG59XG5cbmNvbnN0IEF1dGhDb250ZXh0ID0gY3JlYXRlQ29udGV4dDxBdXRoQ29udGV4dFR5cGU+KHtcbiAgdXNlcjogbnVsbCxcbiAgbG9hZGluZzogZmFsc2UsXG4gIGxvZ2luOiBhc3luYyAoKSA9PiB7fSxcbiAgbG9nb3V0OiBhc3luYyAoKSA9PiB7fSxcbn0pO1xuXG5jb25zdCBmZXRjaGVyID0gKHVybDogc3RyaW5nKSA9PiBmZXRjaCh1cmwsIHsgY3JlZGVudGlhbHM6ICdpbmNsdWRlJyB9KS50aGVuKHIgPT4gci5vayA/IHIuanNvbigpIDogbnVsbCk7XG5cbmV4cG9ydCBmdW5jdGlvbiBBdXRoUHJvdmlkZXIoeyBjaGlsZHJlbiB9OiB7IGNoaWxkcmVuOiBSZWFjdE5vZGUgfSkge1xuICBjb25zdCB7IGRhdGE6IHVzZXIsIG11dGF0ZSwgaXNMb2FkaW5nIH0gPSB1c2VTV1I8VXNlciB8IG51bGw+KCcvYXBpL2F1dGgvc2Vzc2lvbicsIGZldGNoZXIpO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIGxvZ2luKGVtYWlsOiBzdHJpbmcsIHBhc3N3b3JkOiBzdHJpbmcpIHtcbiAgICBjb25zdCByZXMgPSBhd2FpdCBmZXRjaCgnL2FwaS9hdXRoL2xvZ2luJywge1xuICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcbiAgICAgIGNyZWRlbnRpYWxzOiAnaW5jbHVkZScsXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVtYWlsLCBwYXNzd29yZCB9KSxcbiAgICB9KTtcbiAgICBpZiAoIXJlcy5vaykgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNyZWRlbnRpYWxzJyk7XG4gICAgYXdhaXQgbXV0YXRlKCk7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBsb2dvdXQoKSB7XG4gICAgYXdhaXQgZmV0Y2goJy9hcGkvYXV0aC9sb2dvdXQnLCB7IG1ldGhvZDogJ1BPU1QnLCBjcmVkZW50aWFsczogJ2luY2x1ZGUnIH0pO1xuICAgIGF3YWl0IG11dGF0ZShudWxsKTtcbiAgfVxuXG4gIHJldHVybiAoXG4gICAgPEF1dGhDb250ZXh0LlByb3ZpZGVyIHZhbHVlPXt7IHVzZXIsIGxvYWRpbmc6IGlzTG9hZGluZywgbG9naW4sIGxvZ291dCB9fT5cbiAgICAgIHtjaGlsZHJlbn1cbiAgICA8L0F1dGhDb250ZXh0LlByb3ZpZGVyPlxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdXNlQXV0aCgpIHtcbiAgcmV0dXJuIHVzZUNvbnRleHQoQXV0aENvbnRleHQpO1xufSAiXSwibmFtZXMiOlsiUmVhY3QiLCJjcmVhdGVDb250ZXh0IiwidXNlQ29udGV4dCIsInVzZVNXUiIsIkF1dGhDb250ZXh0IiwidXNlciIsImxvYWRpbmciLCJsb2dpbiIsImxvZ291dCIsImZldGNoZXIiLCJ1cmwiLCJmZXRjaCIsImNyZWRlbnRpYWxzIiwidGhlbiIsInIiLCJvayIsImpzb24iLCJBdXRoUHJvdmlkZXIiLCJjaGlsZHJlbiIsImRhdGEiLCJtdXRhdGUiLCJpc0xvYWRpbmciLCJlbWFpbCIsInBhc3N3b3JkIiwicmVzIiwibWV0aG9kIiwiaGVhZGVycyIsImJvZHkiLCJKU09OIiwic3RyaW5naWZ5IiwiRXJyb3IiLCJQcm92aWRlciIsInZhbHVlIiwidXNlQXV0aCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(pages-dir-node)/./src/AuthContext.tsx\n");

/***/ }),

/***/ "(pages-dir-node)/./styles/globals.css":
/*!****************************!*\
  !*** ./styles/globals.css ***!
  \****************************/
/***/ (() => {



/***/ }),

/***/ "(pages-dir-node)/__barrel_optimize__?names=Bar,BarChart,ResponsiveContainer,Tooltip,XAxis,YAxis!=!./node_modules/recharts/es6/index.js":
/*!*****************************************************************************************************************************!*\
  !*** __barrel_optimize__?names=Bar,BarChart,ResponsiveContainer,Tooltip,XAxis,YAxis!=!./node_modules/recharts/es6/index.js ***!
  \*****************************************************************************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.a(module, async (__webpack_handle_async_dependencies__, __webpack_async_result__) => { try {\n__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   Bar: () => (/* reexport safe */ _cartesian_Bar__WEBPACK_IMPORTED_MODULE_0__.Bar),\n/* harmony export */   BarChart: () => (/* reexport safe */ _chart_BarChart__WEBPACK_IMPORTED_MODULE_1__.BarChart),\n/* harmony export */   ResponsiveContainer: () => (/* reexport safe */ _component_ResponsiveContainer__WEBPACK_IMPORTED_MODULE_2__.ResponsiveContainer),\n/* harmony export */   Tooltip: () => (/* reexport safe */ _component_Tooltip__WEBPACK_IMPORTED_MODULE_3__.Tooltip),\n/* harmony export */   XAxis: () => (/* reexport safe */ _cartesian_XAxis__WEBPACK_IMPORTED_MODULE_4__.XAxis),\n/* harmony export */   YAxis: () => (/* reexport safe */ _cartesian_YAxis__WEBPACK_IMPORTED_MODULE_5__.YAxis)\n/* harmony export */ });\n/* harmony import */ var _cartesian_Bar__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./cartesian/Bar */ \"(pages-dir-node)/./node_modules/recharts/es6/cartesian/Bar.js\");\n/* harmony import */ var _chart_BarChart__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./chart/BarChart */ \"(pages-dir-node)/./node_modules/recharts/es6/chart/BarChart.js\");\n/* harmony import */ var _component_ResponsiveContainer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./component/ResponsiveContainer */ \"(pages-dir-node)/./node_modules/recharts/es6/component/ResponsiveContainer.js\");\n/* harmony import */ var _component_Tooltip__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./component/Tooltip */ \"(pages-dir-node)/./node_modules/recharts/es6/component/Tooltip.js\");\n/* harmony import */ var _cartesian_XAxis__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./cartesian/XAxis */ \"(pages-dir-node)/./node_modules/recharts/es6/cartesian/XAxis.js\");\n/* harmony import */ var _cartesian_YAxis__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./cartesian/YAxis */ \"(pages-dir-node)/./node_modules/recharts/es6/cartesian/YAxis.js\");\nvar __webpack_async_dependencies__ = __webpack_handle_async_dependencies__([_cartesian_Bar__WEBPACK_IMPORTED_MODULE_0__, _chart_BarChart__WEBPACK_IMPORTED_MODULE_1__, _component_ResponsiveContainer__WEBPACK_IMPORTED_MODULE_2__, _component_Tooltip__WEBPACK_IMPORTED_MODULE_3__, _cartesian_XAxis__WEBPACK_IMPORTED_MODULE_4__, _cartesian_YAxis__WEBPACK_IMPORTED_MODULE_5__]);\n([_cartesian_Bar__WEBPACK_IMPORTED_MODULE_0__, _chart_BarChart__WEBPACK_IMPORTED_MODULE_1__, _component_ResponsiveContainer__WEBPACK_IMPORTED_MODULE_2__, _component_Tooltip__WEBPACK_IMPORTED_MODULE_3__, _cartesian_XAxis__WEBPACK_IMPORTED_MODULE_4__, _cartesian_YAxis__WEBPACK_IMPORTED_MODULE_5__] = __webpack_async_dependencies__.then ? (await __webpack_async_dependencies__)() : __webpack_async_dependencies__);\n\n\n\n\n\n\n\n__webpack_async_result__();\n} catch(e) { __webpack_async_result__(e); } });//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS9fX2JhcnJlbF9vcHRpbWl6ZV9fP25hbWVzPUJhcixCYXJDaGFydCxSZXNwb25zaXZlQ29udGFpbmVyLFRvb2x0aXAsWEF4aXMsWUF4aXMhPSEuL25vZGVfbW9kdWxlcy9yZWNoYXJ0cy9lczYvaW5kZXguanMiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNxQztBQUNNO0FBQzBCO0FBQ3hCO0FBQ0oiLCJzb3VyY2VzIjpbIi9Vc2Vycy9jcGcvc3VpdHN5bmNfZnVsbC9mcm9udGVuZC9ub2RlX21vZHVsZXMvcmVjaGFydHMvZXM2L2luZGV4LmpzIl0sInNvdXJjZXNDb250ZW50IjpbIlxuZXhwb3J0IHsgQmFyIH0gZnJvbSBcIi4vY2FydGVzaWFuL0JhclwiXG5leHBvcnQgeyBCYXJDaGFydCB9IGZyb20gXCIuL2NoYXJ0L0JhckNoYXJ0XCJcbmV4cG9ydCB7IFJlc3BvbnNpdmVDb250YWluZXIgfSBmcm9tIFwiLi9jb21wb25lbnQvUmVzcG9uc2l2ZUNvbnRhaW5lclwiXG5leHBvcnQgeyBUb29sdGlwIH0gZnJvbSBcIi4vY29tcG9uZW50L1Rvb2x0aXBcIlxuZXhwb3J0IHsgWEF4aXMgfSBmcm9tIFwiLi9jYXJ0ZXNpYW4vWEF4aXNcIlxuZXhwb3J0IHsgWUF4aXMgfSBmcm9tIFwiLi9jYXJ0ZXNpYW4vWUF4aXNcIiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(pages-dir-node)/__barrel_optimize__?names=Bar,BarChart,ResponsiveContainer,Tooltip,XAxis,YAxis!=!./node_modules/recharts/es6/index.js\n");

/***/ }),

/***/ "(pages-dir-node)/__barrel_optimize__?names=BarChart,Calendar,Home,Menu,Moon,Printer,Scissors,Settings,Sun,Users!=!./node_modules/lucide-react/dist/esm/lucide-react.js":
/*!*************************************************************************************************************************************************************!*\
  !*** __barrel_optimize__?names=BarChart,Calendar,Home,Menu,Moon,Printer,Scissors,Settings,Sun,Users!=!./node_modules/lucide-react/dist/esm/lucide-react.js ***!
  \*************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   BarChart: () => (/* reexport safe */ _icons_bar_chart_js__WEBPACK_IMPORTED_MODULE_0__[\"default\"]),\n/* harmony export */   Calendar: () => (/* reexport safe */ _icons_calendar_js__WEBPACK_IMPORTED_MODULE_1__[\"default\"]),\n/* harmony export */   Home: () => (/* reexport safe */ _icons_home_js__WEBPACK_IMPORTED_MODULE_2__[\"default\"]),\n/* harmony export */   Menu: () => (/* reexport safe */ _icons_menu_js__WEBPACK_IMPORTED_MODULE_3__[\"default\"]),\n/* harmony export */   Moon: () => (/* reexport safe */ _icons_moon_js__WEBPACK_IMPORTED_MODULE_4__[\"default\"]),\n/* harmony export */   Printer: () => (/* reexport safe */ _icons_printer_js__WEBPACK_IMPORTED_MODULE_5__[\"default\"]),\n/* harmony export */   Scissors: () => (/* reexport safe */ _icons_scissors_js__WEBPACK_IMPORTED_MODULE_6__[\"default\"]),\n/* harmony export */   Settings: () => (/* reexport safe */ _icons_settings_js__WEBPACK_IMPORTED_MODULE_7__[\"default\"]),\n/* harmony export */   Sun: () => (/* reexport safe */ _icons_sun_js__WEBPACK_IMPORTED_MODULE_8__[\"default\"]),\n/* harmony export */   Users: () => (/* reexport safe */ _icons_users_js__WEBPACK_IMPORTED_MODULE_9__[\"default\"])\n/* harmony export */ });\n/* harmony import */ var _icons_bar_chart_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./icons/bar-chart.js */ \"(pages-dir-node)/./node_modules/lucide-react/dist/esm/icons/bar-chart.js\");\n/* harmony import */ var _icons_calendar_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./icons/calendar.js */ \"(pages-dir-node)/./node_modules/lucide-react/dist/esm/icons/calendar.js\");\n/* harmony import */ var _icons_home_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./icons/home.js */ \"(pages-dir-node)/./node_modules/lucide-react/dist/esm/icons/home.js\");\n/* harmony import */ var _icons_menu_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./icons/menu.js */ \"(pages-dir-node)/./node_modules/lucide-react/dist/esm/icons/menu.js\");\n/* harmony import */ var _icons_moon_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./icons/moon.js */ \"(pages-dir-node)/./node_modules/lucide-react/dist/esm/icons/moon.js\");\n/* harmony import */ var _icons_printer_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./icons/printer.js */ \"(pages-dir-node)/./node_modules/lucide-react/dist/esm/icons/printer.js\");\n/* harmony import */ var _icons_scissors_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./icons/scissors.js */ \"(pages-dir-node)/./node_modules/lucide-react/dist/esm/icons/scissors.js\");\n/* harmony import */ var _icons_settings_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./icons/settings.js */ \"(pages-dir-node)/./node_modules/lucide-react/dist/esm/icons/settings.js\");\n/* harmony import */ var _icons_sun_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./icons/sun.js */ \"(pages-dir-node)/./node_modules/lucide-react/dist/esm/icons/sun.js\");\n/* harmony import */ var _icons_users_js__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./icons/users.js */ \"(pages-dir-node)/./node_modules/lucide-react/dist/esm/icons/users.js\");\n\n\n\n\n\n\n\n\n\n\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHBhZ2VzLWRpci1ub2RlKS9fX2JhcnJlbF9vcHRpbWl6ZV9fP25hbWVzPUJhckNoYXJ0LENhbGVuZGFyLEhvbWUsTWVudSxNb29uLFByaW50ZXIsU2Npc3NvcnMsU2V0dGluZ3MsU3VuLFVzZXJzIT0hLi9ub2RlX21vZHVsZXMvbHVjaWRlLXJlYWN0L2Rpc3QvZXNtL2x1Y2lkZS1yZWFjdC5qcyIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDMEQ7QUFDRDtBQUNSO0FBQ0E7QUFDQTtBQUNNO0FBQ0U7QUFDQTtBQUNWIiwic291cmNlcyI6WyIvVXNlcnMvY3BnL3N1aXRzeW5jX2Z1bGwvZnJvbnRlbmQvbm9kZV9tb2R1bGVzL2x1Y2lkZS1yZWFjdC9kaXN0L2VzbS9sdWNpZGUtcmVhY3QuanMiXSwic291cmNlc0NvbnRlbnQiOlsiXG5leHBvcnQgeyBkZWZhdWx0IGFzIEJhckNoYXJ0IH0gZnJvbSBcIi4vaWNvbnMvYmFyLWNoYXJ0LmpzXCJcbmV4cG9ydCB7IGRlZmF1bHQgYXMgQ2FsZW5kYXIgfSBmcm9tIFwiLi9pY29ucy9jYWxlbmRhci5qc1wiXG5leHBvcnQgeyBkZWZhdWx0IGFzIEhvbWUgfSBmcm9tIFwiLi9pY29ucy9ob21lLmpzXCJcbmV4cG9ydCB7IGRlZmF1bHQgYXMgTWVudSB9IGZyb20gXCIuL2ljb25zL21lbnUuanNcIlxuZXhwb3J0IHsgZGVmYXVsdCBhcyBNb29uIH0gZnJvbSBcIi4vaWNvbnMvbW9vbi5qc1wiXG5leHBvcnQgeyBkZWZhdWx0IGFzIFByaW50ZXIgfSBmcm9tIFwiLi9pY29ucy9wcmludGVyLmpzXCJcbmV4cG9ydCB7IGRlZmF1bHQgYXMgU2Npc3NvcnMgfSBmcm9tIFwiLi9pY29ucy9zY2lzc29ycy5qc1wiXG5leHBvcnQgeyBkZWZhdWx0IGFzIFNldHRpbmdzIH0gZnJvbSBcIi4vaWNvbnMvc2V0dGluZ3MuanNcIlxuZXhwb3J0IHsgZGVmYXVsdCBhcyBTdW4gfSBmcm9tIFwiLi9pY29ucy9zdW4uanNcIlxuZXhwb3J0IHsgZGVmYXVsdCBhcyBVc2VycyB9IGZyb20gXCIuL2ljb25zL3VzZXJzLmpzXCIiXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbMF0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(pages-dir-node)/__barrel_optimize__?names=BarChart,Calendar,Home,Menu,Moon,Printer,Scissors,Settings,Sun,Users!=!./node_modules/lucide-react/dist/esm/lucide-react.js\n");

/***/ }),

/***/ "clsx":
/*!***********************!*\
  !*** external "clsx" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = import("clsx");;

/***/ }),

/***/ "eventemitter3":
/*!********************************!*\
  !*** external "eventemitter3" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("eventemitter3");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "lodash/every":
/*!*******************************!*\
  !*** external "lodash/every" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/every");

/***/ }),

/***/ "lodash/find":
/*!******************************!*\
  !*** external "lodash/find" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/find");

/***/ }),

/***/ "lodash/flatMap":
/*!*********************************!*\
  !*** external "lodash/flatMap" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/flatMap");

/***/ }),

/***/ "lodash/get":
/*!*****************************!*\
  !*** external "lodash/get" ***!
  \*****************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/get");

/***/ }),

/***/ "lodash/isBoolean":
/*!***********************************!*\
  !*** external "lodash/isBoolean" ***!
  \***********************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/isBoolean");

/***/ }),

/***/ "lodash/isEqual":
/*!*********************************!*\
  !*** external "lodash/isEqual" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/isEqual");

/***/ }),

/***/ "lodash/isFunction":
/*!************************************!*\
  !*** external "lodash/isFunction" ***!
  \************************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/isFunction");

/***/ }),

/***/ "lodash/isNaN":
/*!*******************************!*\
  !*** external "lodash/isNaN" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/isNaN");

/***/ }),

/***/ "lodash/isNil":
/*!*******************************!*\
  !*** external "lodash/isNil" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/isNil");

/***/ }),

/***/ "lodash/isNumber":
/*!**********************************!*\
  !*** external "lodash/isNumber" ***!
  \**********************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/isNumber");

/***/ }),

/***/ "lodash/isObject":
/*!**********************************!*\
  !*** external "lodash/isObject" ***!
  \**********************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/isObject");

/***/ }),

/***/ "lodash/isPlainObject":
/*!***************************************!*\
  !*** external "lodash/isPlainObject" ***!
  \***************************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/isPlainObject");

/***/ }),

/***/ "lodash/isString":
/*!**********************************!*\
  !*** external "lodash/isString" ***!
  \**********************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/isString");

/***/ }),

/***/ "lodash/last":
/*!******************************!*\
  !*** external "lodash/last" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/last");

/***/ }),

/***/ "lodash/mapValues":
/*!***********************************!*\
  !*** external "lodash/mapValues" ***!
  \***********************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/mapValues");

/***/ }),

/***/ "lodash/max":
/*!*****************************!*\
  !*** external "lodash/max" ***!
  \*****************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/max");

/***/ }),

/***/ "lodash/memoize":
/*!*********************************!*\
  !*** external "lodash/memoize" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/memoize");

/***/ }),

/***/ "lodash/min":
/*!*****************************!*\
  !*** external "lodash/min" ***!
  \*****************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/min");

/***/ }),

/***/ "lodash/range":
/*!*******************************!*\
  !*** external "lodash/range" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/range");

/***/ }),

/***/ "lodash/some":
/*!******************************!*\
  !*** external "lodash/some" ***!
  \******************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/some");

/***/ }),

/***/ "lodash/sortBy":
/*!********************************!*\
  !*** external "lodash/sortBy" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/sortBy");

/***/ }),

/***/ "lodash/throttle":
/*!**********************************!*\
  !*** external "lodash/throttle" ***!
  \**********************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/throttle");

/***/ }),

/***/ "lodash/uniqBy":
/*!********************************!*\
  !*** external "lodash/uniqBy" ***!
  \********************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/uniqBy");

/***/ }),

/***/ "lodash/upperFirst":
/*!************************************!*\
  !*** external "lodash/upperFirst" ***!
  \************************************/
/***/ ((module) => {

"use strict";
module.exports = require("lodash/upperFirst");

/***/ }),

/***/ "next/dist/compiled/next-server/pages.runtime.dev.js":
/*!**********************************************************************!*\
  !*** external "next/dist/compiled/next-server/pages.runtime.dev.js" ***!
  \**********************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/pages.runtime.dev.js");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "react":
/*!************************!*\
  !*** external "react" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("react");

/***/ }),

/***/ "react-dom":
/*!****************************!*\
  !*** external "react-dom" ***!
  \****************************/
/***/ ((module) => {

"use strict";
module.exports = require("react-dom");

/***/ }),

/***/ "react-hot-toast":
/*!**********************************!*\
  !*** external "react-hot-toast" ***!
  \**********************************/
/***/ ((module) => {

"use strict";
module.exports = import("react-hot-toast");;

/***/ }),

/***/ "react-is":
/*!***************************!*\
  !*** external "react-is" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("react-is");

/***/ }),

/***/ "react-smooth":
/*!*******************************!*\
  !*** external "react-smooth" ***!
  \*******************************/
/***/ ((module) => {

"use strict";
module.exports = require("react-smooth");

/***/ }),

/***/ "react/jsx-dev-runtime":
/*!****************************************!*\
  !*** external "react/jsx-dev-runtime" ***!
  \****************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-dev-runtime");

/***/ }),

/***/ "react/jsx-runtime":
/*!************************************!*\
  !*** external "react/jsx-runtime" ***!
  \************************************/
/***/ ((module) => {

"use strict";
module.exports = require("react/jsx-runtime");

/***/ }),

/***/ "recharts-scale":
/*!*********************************!*\
  !*** external "recharts-scale" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = require("recharts-scale");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "swr":
/*!**********************!*\
  !*** external "swr" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = import("swr");;

/***/ }),

/***/ "tiny-invariant":
/*!*********************************!*\
  !*** external "tiny-invariant" ***!
  \*********************************/
/***/ ((module) => {

"use strict";
module.exports = import("tiny-invariant");;

/***/ }),

/***/ "victory-vendor/d3-scale":
/*!******************************************!*\
  !*** external "victory-vendor/d3-scale" ***!
  \******************************************/
/***/ ((module) => {

"use strict";
module.exports = require("victory-vendor/d3-scale");

/***/ }),

/***/ "victory-vendor/d3-shape":
/*!******************************************!*\
  !*** external "victory-vendor/d3-shape" ***!
  \******************************************/
/***/ ((module) => {

"use strict";
module.exports = require("victory-vendor/d3-shape");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@swc","vendor-chunks/lucide-react","vendor-chunks/recharts"], () => (__webpack_exec__("(pages-dir-node)/./node_modules/next/dist/build/webpack/loaders/next-route-loader/index.js?kind=PAGES&page=%2Fcommission&preferredRegion=&absolutePagePath=.%2Fpages%2Fcommission.tsx&absoluteAppPath=private-next-pages%2F_app&absoluteDocumentPath=private-next-pages%2F_document&middlewareConfigBase64=e30%3D!")));
module.exports = __webpack_exports__;

})();