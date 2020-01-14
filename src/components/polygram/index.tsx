import { h } from "preact";
import * as style from "./style.css";
import Canvas from '../canvas';

interface Props {}

const Polygram: preact.FunctionalComponent<Props> = props => {
    return (
        <div class={style.wrapper}>
            <h1>Polygram TODO</h1>
            <Canvas />
        </div>
    );
};

export default Polygram;
