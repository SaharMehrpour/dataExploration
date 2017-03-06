/**
 * Created by Caleydo Team on 31.08.2016.
 */

import {select} from 'd3-selection';
import * as drawPlots from './drawPlots'
import * as printLogs from './printLogs'

/**
 * The main class for the App app
 */
export class App {

  private $node;

  constructor(parent: Element) {
    this.$node = select(parent);
  }

  /**
   * Initialize the view and return a promise
   * that is resolved as soon the view is completely initialized.
   * @returns {Promise<App>}
   */
  init() {
    return this.build();
  }

  /**
   * Load and initialize all necessary views
   * @returns {Promise<App>}
   */
  private async build() {

    //let dp = drawPlots.create(this.$node.node());
    //await dp.run();

    let pl = printLogs.create();
    //await pl.runLogs();
    //await pl.runDemo();

    // Not Working!
    //await pl.runRemove();

    await pl.showInfo();
    await pl.showRow();
    await pl.showCol();

    this.$node.select('h3').remove();
    this.setBusy(false);
  }

  /**
   * Show or hide the application loading indicator
   * @param isBusy
   */
  setBusy(isBusy: boolean) {
    this.$node.select('.busy').classed('hidden', !isBusy);
  }

}

/**
 * Factory method to create a new app instance
 * @param parent
 * @returns {App}
 */
export function create(parent:Element) {
  return new App(parent);
}
