import { h, Component } from "preact";
// import * as style from "./style.css";

interface Props {
    width: number;
    height: number;
    color: string;
}

interface State {}

class Canvas extends Component<Props, State> {

    componentDidMount() {
        if (this.base && 'querySelector' in this.base) {
            const canvas = this.base.querySelector('canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d')
                if (ctx) {
                    ctx.globalCompositeOperation = 'source-over'
                    ctx.save();
                    this.drawOuter(ctx)(Date.now());
                }
            }
        }
    }

    drawOuter (ctx: CanvasRenderingContext2D) {
        const self = this;
        return function draw (ts: number) {
            ctx.fillStyle = self.props.color;
            ctx.fillRect(0, 0, self.props.width, self.props.height);
            window.requestAnimationFrame(draw);
        }
    }

    render() {
        return (
            <div style={{padding: '2rem'}}>
                <canvas height={this.props.height} width={this.props.width}>
                </canvas>
            </div>
        );
    }
}

export default Canvas;
