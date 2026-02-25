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
exports.id = "app/api/order/draft/route";
exports.ids = ["app/api/order/draft/route"];
exports.modules = {

/***/ "(rsc)/./app/api/order/draft/route.ts":
/*!**************************************!*\
  !*** ./app/api/order/draft/route.ts ***!
  \**************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! crypto */ \"crypto\");\n/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(crypto__WEBPACK_IMPORTED_MODULE_1__);\n/* harmony import */ var _lib_supabase_admin__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @/lib/supabase-admin */ \"(rsc)/./lib/supabase-admin.ts\");\n\n\n\nasync function POST(req) {\n    try {\n        const body = await req.json().catch(()=>({}));\n        console.log(\"[order-draft] create start\", {\n            body\n        });\n        const publicToken = (0,crypto__WEBPACK_IMPORTED_MODULE_1__.randomUUID)();\n        // IMPORTANT:\n        // dacă tabela ta are alte coloane obligatorii, adaugă-le aici\n        const insertPayload = {\n            public_token: publicToken,\n            status: \"draft\"\n        };\n        const { data, error } = await _lib_supabase_admin__WEBPACK_IMPORTED_MODULE_2__.supabaseAdmin.from(\"orders\").insert(insertPayload).select(\"id, public_token, status\").single();\n        if (error) {\n            console.error(\"[order-draft] insert error\", error);\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                ok: false,\n                error: {\n                    message: \"Nu s-a putut crea comanda draft.\",\n                    details: error.message,\n                    code: error.code\n                }\n            }, {\n                status: 500\n            });\n        }\n        console.log(\"[order-draft] create success\", {\n            id: data?.id,\n            publicToken: data?.public_token,\n            status: data?.status\n        });\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            ok: true,\n            order: {\n                id: data?.id,\n                publicToken: data?.public_token,\n                status: data?.status\n            }\n        }, {\n            status: 201\n        });\n    } catch (err) {\n        console.error(\"[order-draft] unexpected error\", err);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            ok: false,\n            error: {\n                message: \"Eroare internă la crearea comenzii draft.\"\n            }\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL29yZGVyL2RyYWZ0L3JvdXRlLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQTJDO0FBQ1A7QUFDaUI7QUFNOUMsZUFBZUcsS0FBS0MsR0FBWTtJQUNyQyxJQUFJO1FBQ0YsTUFBTUMsT0FBUSxNQUFNRCxJQUFJRSxJQUFJLEdBQUdDLEtBQUssQ0FBQyxJQUFPLEVBQUM7UUFFN0NDLFFBQVFDLEdBQUcsQ0FBQyw4QkFBOEI7WUFBRUo7UUFBSztRQUVqRCxNQUFNSyxjQUFjVCxrREFBVUE7UUFFOUIsYUFBYTtRQUNiLDhEQUE4RDtRQUM5RCxNQUFNVSxnQkFBeUM7WUFDN0NDLGNBQWNGO1lBQ2RHLFFBQVE7UUFFVjtRQUVBLE1BQU0sRUFBRUMsSUFBSSxFQUFFQyxLQUFLLEVBQUUsR0FBRyxNQUFNYiw4REFBYUEsQ0FDeENjLElBQUksQ0FBQyxVQUNMQyxNQUFNLENBQUNOLGVBQ1BPLE1BQU0sQ0FBQyw0QkFDUEMsTUFBTTtRQUVULElBQUlKLE9BQU87WUFDVFAsUUFBUU8sS0FBSyxDQUFDLDhCQUE4QkE7WUFDNUMsT0FBT2YscURBQVlBLENBQUNNLElBQUksQ0FDdEI7Z0JBQ0VjLElBQUk7Z0JBQ0pMLE9BQU87b0JBQ0xNLFNBQVM7b0JBQ1RDLFNBQVNQLE1BQU1NLE9BQU87b0JBQ3RCRSxNQUFNUixNQUFNUSxJQUFJO2dCQUNsQjtZQUNGLEdBQ0E7Z0JBQUVWLFFBQVE7WUFBSTtRQUVsQjtRQUVBTCxRQUFRQyxHQUFHLENBQUMsZ0NBQWdDO1lBQzFDZSxJQUFJVixNQUFNVTtZQUNWZCxhQUFhSSxNQUFNRjtZQUNuQkMsUUFBUUMsTUFBTUQ7UUFDaEI7UUFFQSxPQUFPYixxREFBWUEsQ0FBQ00sSUFBSSxDQUN0QjtZQUNFYyxJQUFJO1lBQ0pLLE9BQU87Z0JBQ0xELElBQUlWLE1BQU1VO2dCQUNWZCxhQUFhSSxNQUFNRjtnQkFDbkJDLFFBQVFDLE1BQU1EO1lBQ2hCO1FBQ0YsR0FDQTtZQUFFQSxRQUFRO1FBQUk7SUFFbEIsRUFBRSxPQUFPYSxLQUFLO1FBQ1psQixRQUFRTyxLQUFLLENBQUMsa0NBQWtDVztRQUVoRCxPQUFPMUIscURBQVlBLENBQUNNLElBQUksQ0FDdEI7WUFDRWMsSUFBSTtZQUNKTCxPQUFPO2dCQUNMTSxTQUFTO1lBQ1g7UUFDRixHQUNBO1lBQUVSLFFBQVE7UUFBSTtJQUVsQjtBQUNGIiwic291cmNlcyI6WyIvVXNlcnMvbWlobmVhc21hY2Jvb2thaXIvRGVza3RvcC9Xb3JrL2JhbmF0b24tZmVzdC9hcHAvYXBpL29yZGVyL2RyYWZ0L3JvdXRlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IE5leHRSZXNwb25zZSB9IGZyb20gXCJuZXh0L3NlcnZlclwiO1xuaW1wb3J0IHsgcmFuZG9tVVVJRCB9IGZyb20gXCJjcnlwdG9cIjtcbmltcG9ydCB7IHN1cGFiYXNlQWRtaW4gfSBmcm9tIFwiQC9saWIvc3VwYWJhc2UtYWRtaW5cIjtcblxudHlwZSBDcmVhdGVEcmFmdEJvZHkgPSB7XG4gIHNvdXJjZT86IHN0cmluZztcbn07XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQT1NUKHJlcTogUmVxdWVzdCkge1xuICB0cnkge1xuICAgIGNvbnN0IGJvZHkgPSAoYXdhaXQgcmVxLmpzb24oKS5jYXRjaCgoKSA9PiAoe30pKSkgYXMgQ3JlYXRlRHJhZnRCb2R5O1xuXG4gICAgY29uc29sZS5sb2coXCJbb3JkZXItZHJhZnRdIGNyZWF0ZSBzdGFydFwiLCB7IGJvZHkgfSk7XG5cbiAgICBjb25zdCBwdWJsaWNUb2tlbiA9IHJhbmRvbVVVSUQoKTtcblxuICAgIC8vIElNUE9SVEFOVDpcbiAgICAvLyBkYWPEgyB0YWJlbGEgdGEgYXJlIGFsdGUgY29sb2FuZSBvYmxpZ2F0b3JpaSwgYWRhdWfEgy1sZSBhaWNpXG4gICAgY29uc3QgaW5zZXJ0UGF5bG9hZDogUmVjb3JkPHN0cmluZywgdW5rbm93bj4gPSB7XG4gICAgICBwdWJsaWNfdG9rZW46IHB1YmxpY1Rva2VuLFxuICAgICAgc3RhdHVzOiBcImRyYWZ0XCIsXG4gICAgICAvLyBzb3VyY2U6IGJvZHkuc291cmNlID8/IFwid2ViXCIsIC8vIGRlLWNvbWVudGVhesSDIERPQVIgZGFjxIMgYWkgY29sb2FuYSBzb3VyY2Ugw65uIG9yZGVyc1xuICAgIH07XG5cbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZUFkbWluXG4gICAgICAuZnJvbShcIm9yZGVyc1wiKVxuICAgICAgLmluc2VydChpbnNlcnRQYXlsb2FkKVxuICAgICAgLnNlbGVjdChcImlkLCBwdWJsaWNfdG9rZW4sIHN0YXR1c1wiKVxuICAgICAgLnNpbmdsZSgpO1xuXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKFwiW29yZGVyLWRyYWZ0XSBpbnNlcnQgZXJyb3JcIiwgZXJyb3IpO1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKFxuICAgICAgICB7XG4gICAgICAgICAgb2s6IGZhbHNlLFxuICAgICAgICAgIGVycm9yOiB7XG4gICAgICAgICAgICBtZXNzYWdlOiBcIk51IHMtYSBwdXR1dCBjcmVhIGNvbWFuZGEgZHJhZnQuXCIsXG4gICAgICAgICAgICBkZXRhaWxzOiBlcnJvci5tZXNzYWdlLFxuICAgICAgICAgICAgY29kZTogZXJyb3IuY29kZSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICB7IHN0YXR1czogNTAwIH0sXG4gICAgICApO1xuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKFwiW29yZGVyLWRyYWZ0XSBjcmVhdGUgc3VjY2Vzc1wiLCB7XG4gICAgICBpZDogZGF0YT8uaWQsXG4gICAgICBwdWJsaWNUb2tlbjogZGF0YT8ucHVibGljX3Rva2VuLFxuICAgICAgc3RhdHVzOiBkYXRhPy5zdGF0dXMsXG4gICAgfSk7XG5cbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXG4gICAgICB7XG4gICAgICAgIG9rOiB0cnVlLFxuICAgICAgICBvcmRlcjoge1xuICAgICAgICAgIGlkOiBkYXRhPy5pZCxcbiAgICAgICAgICBwdWJsaWNUb2tlbjogZGF0YT8ucHVibGljX3Rva2VuLFxuICAgICAgICAgIHN0YXR1czogZGF0YT8uc3RhdHVzLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHsgc3RhdHVzOiAyMDEgfSxcbiAgICApO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiW29yZGVyLWRyYWZ0XSB1bmV4cGVjdGVkIGVycm9yXCIsIGVycik7XG5cbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oXG4gICAgICB7XG4gICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IHtcbiAgICAgICAgICBtZXNzYWdlOiBcIkVyb2FyZSBpbnRlcm7EgyBsYSBjcmVhcmVhIGNvbWVuemlpIGRyYWZ0LlwiLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICAgIHsgc3RhdHVzOiA1MDAgfSxcbiAgICApO1xuICB9XG59XG4iXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwicmFuZG9tVVVJRCIsInN1cGFiYXNlQWRtaW4iLCJQT1NUIiwicmVxIiwiYm9keSIsImpzb24iLCJjYXRjaCIsImNvbnNvbGUiLCJsb2ciLCJwdWJsaWNUb2tlbiIsImluc2VydFBheWxvYWQiLCJwdWJsaWNfdG9rZW4iLCJzdGF0dXMiLCJkYXRhIiwiZXJyb3IiLCJmcm9tIiwiaW5zZXJ0Iiwic2VsZWN0Iiwic2luZ2xlIiwib2siLCJtZXNzYWdlIiwiZGV0YWlscyIsImNvZGUiLCJpZCIsIm9yZGVyIiwiZXJyIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/order/draft/route.ts\n");

/***/ }),

/***/ "(rsc)/./lib/supabase-admin.ts":
/*!*******************************!*\
  !*** ./lib/supabase-admin.ts ***!
  \*******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   supabaseAdmin: () => (/* binding */ supabaseAdmin)\n/* harmony export */ });\n/* harmony import */ var _supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/supabase-js */ \"(rsc)/./node_modules/@supabase/supabase-js/dist/index.mjs\");\n\nconst supabaseUrl = \"https://myqtgkuqccoedfqsdiji.supabase.co\";\nconst serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;\nif (!supabaseUrl) throw new Error(\"Missing NEXT_PUBLIC_SUPABASE_URL\");\nif (!serviceRoleKey) throw new Error(\"Missing SUPABASE_SERVICE_ROLE_KEY\");\nconst supabaseAdmin = (0,_supabase_supabase_js__WEBPACK_IMPORTED_MODULE_0__.createClient)(supabaseUrl, serviceRoleKey, {\n    auth: {\n        persistSession: false,\n        autoRefreshToken: false\n    }\n});\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9saWIvc3VwYWJhc2UtYWRtaW4udHMiLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBcUQ7QUFFckQsTUFBTUMsY0FBY0MsMENBQW9DO0FBQ3hELE1BQU1HLGlCQUFpQkgsUUFBUUMsR0FBRyxDQUFDRyx5QkFBeUI7QUFFNUQsSUFBSSxDQUFDTCxhQUFhLE1BQU0sSUFBSU0sTUFBTTtBQUNsQyxJQUFJLENBQUNGLGdCQUFnQixNQUFNLElBQUlFLE1BQU07QUFFOUIsTUFBTUMsZ0JBQWdCUixtRUFBWUEsQ0FBQ0MsYUFBYUksZ0JBQWdCO0lBQ3JFSSxNQUFNO1FBQ0pDLGdCQUFnQjtRQUNoQkMsa0JBQWtCO0lBQ3BCO0FBQ0YsR0FBRyIsInNvdXJjZXMiOlsiL1VzZXJzL21paG5lYXNtYWNib29rYWlyL0Rlc2t0b3AvV29yay9iYW5hdG9uLWZlc3QvbGliL3N1cGFiYXNlLWFkbWluLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gXCJAc3VwYWJhc2Uvc3VwYWJhc2UtanNcIjtcblxuY29uc3Qgc3VwYWJhc2VVcmwgPSBwcm9jZXNzLmVudi5ORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkw7XG5jb25zdCBzZXJ2aWNlUm9sZUtleSA9IHByb2Nlc3MuZW52LlNVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVk7XG5cbmlmICghc3VwYWJhc2VVcmwpIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMXCIpO1xuaWYgKCFzZXJ2aWNlUm9sZUtleSkgdGhyb3cgbmV3IEVycm9yKFwiTWlzc2luZyBTVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZXCIpO1xuXG5leHBvcnQgY29uc3Qgc3VwYWJhc2VBZG1pbiA9IGNyZWF0ZUNsaWVudChzdXBhYmFzZVVybCwgc2VydmljZVJvbGVLZXksIHtcbiAgYXV0aDoge1xuICAgIHBlcnNpc3RTZXNzaW9uOiBmYWxzZSxcbiAgICBhdXRvUmVmcmVzaFRva2VuOiBmYWxzZSxcbiAgfSxcbn0pOyJdLCJuYW1lcyI6WyJjcmVhdGVDbGllbnQiLCJzdXBhYmFzZVVybCIsInByb2Nlc3MiLCJlbnYiLCJORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwiLCJzZXJ2aWNlUm9sZUtleSIsIlNVUEFCQVNFX1NFUlZJQ0VfUk9MRV9LRVkiLCJFcnJvciIsInN1cGFiYXNlQWRtaW4iLCJhdXRoIiwicGVyc2lzdFNlc3Npb24iLCJhdXRvUmVmcmVzaFRva2VuIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./lib/supabase-admin.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Forder%2Fdraft%2Froute&page=%2Fapi%2Forder%2Fdraft%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Forder%2Fdraft%2Froute.ts&appDir=%2FUsers%2Fmihneasmacbookair%2FDesktop%2FWork%2Fbanaton-fest%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fmihneasmacbookair%2FDesktop%2FWork%2Fbanaton-fest&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Forder%2Fdraft%2Froute&page=%2Fapi%2Forder%2Fdraft%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Forder%2Fdraft%2Froute.ts&appDir=%2FUsers%2Fmihneasmacbookair%2FDesktop%2FWork%2Fbanaton-fest%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fmihneasmacbookair%2FDesktop%2FWork%2Fbanaton-fest&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_mihneasmacbookair_Desktop_Work_banaton_fest_app_api_order_draft_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/order/draft/route.ts */ \"(rsc)/./app/api/order/draft/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/order/draft/route\",\n        pathname: \"/api/order/draft\",\n        filename: \"route\",\n        bundlePath: \"app/api/order/draft/route\"\n    },\n    resolvedPagePath: \"/Users/mihneasmacbookair/Desktop/Work/banaton-fest/app/api/order/draft/route.ts\",\n    nextConfigOutput,\n    userland: _Users_mihneasmacbookair_Desktop_Work_banaton_fest_app_api_order_draft_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZvcmRlciUyRmRyYWZ0JTJGcm91dGUmcGFnZT0lMkZhcGklMkZvcmRlciUyRmRyYWZ0JTJGcm91dGUmYXBwUGF0aHM9JnBhZ2VQYXRoPXByaXZhdGUtbmV4dC1hcHAtZGlyJTJGYXBpJTJGb3JkZXIlMkZkcmFmdCUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRm1paG5lYXNtYWNib29rYWlyJTJGRGVza3RvcCUyRldvcmslMkZiYW5hdG9uLWZlc3QlMkZhcHAmcGFnZUV4dGVuc2lvbnM9dHN4JnBhZ2VFeHRlbnNpb25zPXRzJnBhZ2VFeHRlbnNpb25zPWpzeCZwYWdlRXh0ZW5zaW9ucz1qcyZyb290RGlyPSUyRlVzZXJzJTJGbWlobmVhc21hY2Jvb2thaXIlMkZEZXNrdG9wJTJGV29yayUyRmJhbmF0b24tZmVzdCZpc0Rldj10cnVlJnRzY29uZmlnUGF0aD10c2NvbmZpZy5qc29uJmJhc2VQYXRoPSZhc3NldFByZWZpeD0mbmV4dENvbmZpZ091dHB1dD0mcHJlZmVycmVkUmVnaW9uPSZtaWRkbGV3YXJlQ29uZmlnPWUzMCUzRCEiLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBK0Y7QUFDdkM7QUFDcUI7QUFDK0I7QUFDNUc7QUFDQTtBQUNBO0FBQ0Esd0JBQXdCLHlHQUFtQjtBQUMzQztBQUNBLGNBQWMsa0VBQVM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBLFlBQVk7QUFDWixDQUFDO0FBQ0Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxzREFBc0Q7QUFDOUQ7QUFDQSxXQUFXLDRFQUFXO0FBQ3RCO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDMEY7O0FBRTFGIiwic291cmNlcyI6WyIiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwUm91dGVSb3V0ZU1vZHVsZSB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL3JvdXRlLW1vZHVsZXMvYXBwLXJvdXRlL21vZHVsZS5jb21waWxlZFwiO1xuaW1wb3J0IHsgUm91dGVLaW5kIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUta2luZFwiO1xuaW1wb3J0IHsgcGF0Y2hGZXRjaCBhcyBfcGF0Y2hGZXRjaCB9IGZyb20gXCJuZXh0L2Rpc3Qvc2VydmVyL2xpYi9wYXRjaC1mZXRjaFwiO1xuaW1wb3J0ICogYXMgdXNlcmxhbmQgZnJvbSBcIi9Vc2Vycy9taWhuZWFzbWFjYm9va2Fpci9EZXNrdG9wL1dvcmsvYmFuYXRvbi1mZXN0L2FwcC9hcGkvb3JkZXIvZHJhZnQvcm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL29yZGVyL2RyYWZ0L3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvb3JkZXIvZHJhZnRcIixcbiAgICAgICAgZmlsZW5hbWU6IFwicm91dGVcIixcbiAgICAgICAgYnVuZGxlUGF0aDogXCJhcHAvYXBpL29yZGVyL2RyYWZ0L3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiL1VzZXJzL21paG5lYXNtYWNib29rYWlyL0Rlc2t0b3AvV29yay9iYW5hdG9uLWZlc3QvYXBwL2FwaS9vcmRlci9kcmFmdC9yb3V0ZS50c1wiLFxuICAgIG5leHRDb25maWdPdXRwdXQsXG4gICAgdXNlcmxhbmRcbn0pO1xuLy8gUHVsbCBvdXQgdGhlIGV4cG9ydHMgdGhhdCB3ZSBuZWVkIHRvIGV4cG9zZSBmcm9tIHRoZSBtb2R1bGUuIFRoaXMgc2hvdWxkXG4vLyBiZSBlbGltaW5hdGVkIHdoZW4gd2UndmUgbW92ZWQgdGhlIG90aGVyIHJvdXRlcyB0byB0aGUgbmV3IGZvcm1hdC4gVGhlc2Vcbi8vIGFyZSB1c2VkIHRvIGhvb2sgaW50byB0aGUgcm91dGUuXG5jb25zdCB7IHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcyB9ID0gcm91dGVNb2R1bGU7XG5mdW5jdGlvbiBwYXRjaEZldGNoKCkge1xuICAgIHJldHVybiBfcGF0Y2hGZXRjaCh7XG4gICAgICAgIHdvcmtBc3luY1N0b3JhZ2UsXG4gICAgICAgIHdvcmtVbml0QXN5bmNTdG9yYWdlXG4gICAgfSk7XG59XG5leHBvcnQgeyByb3V0ZU1vZHVsZSwgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzLCBwYXRjaEZldGNoLCAgfTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YXBwLXJvdXRlLmpzLm1hcCJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Forder%2Fdraft%2Froute&page=%2Fapi%2Forder%2Fdraft%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Forder%2Fdraft%2Froute.ts&appDir=%2FUsers%2Fmihneasmacbookair%2FDesktop%2FWork%2Fbanaton-fest%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fmihneasmacbookair%2FDesktop%2FWork%2Fbanaton-fest&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tslib","vendor-chunks/iceberg-js"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Forder%2Fdraft%2Froute&page=%2Fapi%2Forder%2Fdraft%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Forder%2Fdraft%2Froute.ts&appDir=%2FUsers%2Fmihneasmacbookair%2FDesktop%2FWork%2Fbanaton-fest%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Fmihneasmacbookair%2FDesktop%2FWork%2Fbanaton-fest&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();