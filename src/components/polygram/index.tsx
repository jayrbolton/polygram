import { h, Component } from "preact";
import * as style from "./style.css";
import Canvas from '../canvas';
import CanvasSettings from '../canvas-settings';

interface Props {}

interface State {
    width: number;
    height: number;
    color: string;
}

class Polygram extends Component<Props, State> {

    constructor(props: Props) {
        super(props);
        this.state = {
            width: 500,
            height: 500,
            color: '#000000'
        }
    }

    handleSetCanvas(width: number, height: number, color: string) {
        this.setState({ width, height, color })
    }

    render() {
        return (
            <div class={style.wrapper}>
                <CanvasSettings onSetCanvas={this.handleSetCanvas.bind(this)} />
                <Canvas width={this.state.width} height={this.state.height} color={this.state.color} />
            </div>
        );
    }
};

export default Polygram;
