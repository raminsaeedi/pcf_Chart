
import { IInputs, IOutputs } from "./generated/ManifestTypes.js";
import Chart from "chart.js/auto";
import type { ChartTypeRegistry } from "chart.js";


export class ChartPCF
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private notifyOutputChanged: () => void;
  private chartTypeSelector: HTMLSelectElement;
  private container: HTMLDivElement;
  private canvasContainer: HTMLDivElement;
  private chartCanvas: HTMLCanvasElement;
  private context: ComponentFramework.Context<IInputs>;
  private chartInstance: Chart | null = null;
  private previousChartConfig: {
    type: string;
    data: number[];
    labels: string[];
    title: string;
    colors: string[];
  } | null = null;

  /**
   * Empty constructor.
   */
  constructor() {
    // Empty
  }

  /**
   * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
   * Data-set values are not initialized here, use updateView.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
   * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
   * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
   */
  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    try {
      this.container = container;
      this.context = context;
      this.container.style.overflow = "hidden"; // Ensure container logic
      this.container.style.width = "100%";
      this.container.style.display = "flex";
      this.container.style.flexDirection = "column";

      // Create and populate the chart type selector
      this.chartTypeSelector = document.createElement("select");
      const chartTypes = ["bar", "line", "pie", "doughnut", "polarArea", "radar"];
      chartTypes.forEach((type) => {
        const option = document.createElement("option");
        option.value = type;
        option.text = type.charAt(0).toUpperCase() + type.slice(1);
        this.chartTypeSelector.appendChild(option);
      });

      // Add event listener to update chart type independently of context
      this.chartTypeSelector.addEventListener("change", () => {
        this.renderChart();
      });

      this.container.appendChild(this.chartTypeSelector);
      
      this.container.appendChild(this.chartTypeSelector);

      // Create a wrapper for the canvas to control sizing
      this.canvasContainer = document.createElement("div");
      this.canvasContainer.style.position = "relative";
      this.canvasContainer.style.width = "100%";
      this.canvasContainer.style.overflow = "hidden";
      this.canvasContainer.style.flexGrow = "1";

      this.chartCanvas = document.createElement("canvas");
      // Important to set these to valid values for Chart.js to respect container
      this.chartCanvas.style.width = "100%";
      this.chartCanvas.style.height = "100%";
      
      this.canvasContainer.appendChild(this.chartCanvas);
      this.container.appendChild(this.canvasContainer);
      this.renderChart();
    } catch (e) {
      console.error("ChartPCF init failed", e);
    }
  }

  private renderChart() {
    if (this.chartInstance) {
      this.chartInstance.destroy(); //clear previous chart
    }

    //default values
    const defaultType = "bar";
    const defaultLabels = "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec";
    const defaultData = "0,10,20,30,40,50,60,70,80,90,100,110,120";
    const defaultTitle = "Dynamic,Chart";
    const defaultColors =
      "red,green.blue,yellow,purple,orange,black,grey,pink, brown,teal,indigo";

    //get values from context or get user-defiened values
    // Use the selector value if it exists, otherwise fallback to context or default
    const selectedType = this.chartTypeSelector ? this.chartTypeSelector.value : null;
    const chartType = selectedType ?? this.context.parameters.ChartType.raw ?? defaultType;

    // Ensure selector matches the chart type (e.g. on first load or if context changed)
    if (this.chartTypeSelector && this.chartTypeSelector.value !== chartType) {
        this.chartTypeSelector.value = chartType;
    }
    const chartData = this.parseNumberArray(
      this.context.parameters.ChartData.raw,
      defaultData
    );
    const chartLabels = this.parseStringArray(
      this.context.parameters.ChartLabels.raw,
      defaultLabels
    );
    const chartColors = this.parseStringArray(
      this.context.parameters.ChartColors.raw,
      defaultColors
    );
    const chartTitle = this.context.parameters.ChartTitles.raw ?? defaultTitle;

    this.previousChartConfig = {
      type: chartType,
      data: chartData,
      labels: chartLabels,
      title: chartTitle,
      colors: chartColors,
    };

    this.chartInstance = new Chart(this.chartCanvas, {
      type: chartType as keyof ChartTypeRegistry,
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: chartTitle,
            data: chartData,
            backgroundColor: chartColors,
            borderColor: chartColors,
            borderWidth: 2,
            borderRadius: 5,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }

  private parseNumberArray(
    value: string | null,
    defaultvalue: string
  ): number[] {
    return value? value.split(",").map((v) => parseFloat(v.trim())) : defaultvalue.split(",").map((v) => parseFloat(v.trim()));
  }

  private parseStringArray(
    value: string | null,
    defaultvalue: string
  ): string[] {
    return value? value.split(",").map((v) => v.trim()) : defaultvalue.split(",").map((v) => v.trim());
  }

  /**
   * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
   * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
   * @returns ReactElement root react element for the control
   */
  public updateView(
    context: ComponentFramework.Context<IInputs>
  ): void {
    try {
      this.context = context;
    const newChartConfig = {
      type: (this.chartTypeSelector?.value ?? this.context.parameters.ChartType.raw) ?? "bar",
      data: this.parseNumberArray(
        this.context.parameters.ChartData.raw,
        ""
      ),
      labels: this.parseStringArray(
        this.context.parameters.ChartLabels.raw,
        ""
      ),
      title: this.context.parameters.ChartTitles.raw ?? "Dynamic Chart",
      colors: this.parseStringArray(
        this.context.parameters.ChartColors.raw,
        ""
      ),
    };

    if(JSON.stringify(newChartConfig) !== JSON.stringify(this.previousChartConfig)){
      // Clear the canvas container instead of the main container
      this.canvasContainer.innerHTML = "";
      this.chartCanvas = document.createElement("canvas");
      this.chartCanvas.style.width = "100%";
      this.chartCanvas.style.height = "100%";
      this.canvasContainer.appendChild(this.chartCanvas);
      this.renderChart();
    } else if(this.chartInstance){
      this.chartInstance.data.labels = newChartConfig.labels;
      this.chartInstance.data.datasets[0].data = newChartConfig.data;
      this.chartInstance.update();
    }
  } catch (e) {
      console.error("ChartPCF updateView failed", e);
    }
  }

  /**
   * It is called by the framework prior to a control receiving new data.
   * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as "bound" or "output"
   */
  public getOutputs(): IOutputs {
    return {};
  }

  /**
   * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
   * i.e. cancelling any pending remote calls, removing listeners, etc.
   */
  public destroy(): void {
    // Add code to cleanup control if necessary
    if(this.chartInstance){
      this.chartInstance.destroy();
    }
  }
}
