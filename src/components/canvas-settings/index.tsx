import { h, Component } from "preact";
import * as style from "./style.css";

interface Props {
    onSetCanvas: (width: number, height: number, color: string) => void;
}
interface State {}

class CanvasSettings extends Component<Props, State> {
    width: number = 500;
    height: number = 500;
    color: string = '#000000';

    handleInputWidth(width: number) {
        this.width = width;
        if (this.props.onSetCanvas) {
            this.props.onSetCanvas(this.width, this.height, this.color);
        }
    }

    handleInputHeight(height: number) {
        this.height = height;
        if (this.props.onSetCanvas) {
            this.props.onSetCanvas(this.width, this.height, this.color);
        }
    }

    handleInputFill(color: string) {
        this.color = color;
        if (this.props.onSetCanvas) {
            this.props.onSetCanvas(this.width, this.height, this.color);
        }
    }

    render() {
        return (
            <div class={style.canvasSettings}>
                <fieldset class={style.fieldset}>
                    <label class={style.label}>canvas width & height</label>
                    <div class={style.fieldsetInputs}>
                        <input 
                            class={style.input}
                            style={{marginRight: '0.5rem'}}
                            type='number'
                            value={this.width}
                            onInput={ev => this.handleInputWidth(Number(ev.currentTarget.value))}
                        />
                        <input
                            class={style.input}
                            type='number'
                            value={this.height}
                            onInput={ev => this.handleInputHeight(Number(ev.currentTarget.value))}
                        />
                    </div>
                </fieldset>
                <fieldset class={style.fieldset}>
                    <label class={style.label}>canvas background color</label>
                    <input 
                        class={style.colorInput}
                        type='color'
                        value={this.color}
                        onInput={ev => this.handleInputFill(ev.currentTarget.value)}
                    />
                </fieldset>
            </div>
        );
    }
};

export default CanvasSettings;
