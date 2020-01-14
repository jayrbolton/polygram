import { h } from "preact";
import { Route, Router, RouterOnChangeArgs } from "preact-router";

import Polygram from "./polygram";

if ((module as any).hot) {
    // tslint:disable-next-line:no-var-requires
    require("preact/debug");
}

const App: preact.FunctionalComponent = () => {
    let currentUrl: string;
    const handleRoute = (e: RouterOnChangeArgs) => {
        currentUrl = e.url;
    };

    return (
        <div id="app">
            <Router onChange={handleRoute}>
                <Route path="/" component={Polygram} />
            </Router>
        </div>
    );
};

export default App;
