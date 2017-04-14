/**
 * Created by saharmehrpour on 3/8/17.
 */

//import * as ajax from 'phovea_core/src/ajax';
import {select, selectAll} from 'd3-selection';
//import {values,keys} from 'd3-collection'
import * as events from 'phovea_core/src/event';

export class QueryBox {

  private $node;
  private datasetId;

  constructor(parent: Element, datasetId) {

    this.datasetId = datasetId;

    this.$node = select(parent)
      .append('div')
      .classed('queryDiv', true);
/*
    this.$node.append('input')
      .attr('type', 'text')
      .attr('placeholder', 'Search Index')
      .attr('id', 'text');

    this.$node.append('input')
      .attr('type', 'button')
      .attr('value', 'cluster')
      .on('click', () => this.updateTableCluster());

    this.$node.append('input')
      .attr('type', 'button')
      .attr('value', 'similar')
      .on('click', () => this.updateTableSimilar());
*/
    this.$node.append('input')
      .attr('type', 'text')
      .attr('placeholder', 'Search PAT_ID')
      .attr('id', 'text_pat_id');

    this.$node.append('input')
      .attr('type', 'button')
      .attr('value', 'All Info')
      .on('click', () => this.updateTableInfo());

    this.$node.append('input')
      .attr('type', 'button')
      .attr('value', 'Add Patient info')
      .on('click', () => this.addInfo());

    this.$node.append('input')
      .attr('type', 'button')
      .attr('value', 'Remove Patient info')
      .on('click', () => this.removeInfo());

    //this.$node.append('p')
    //  .text('A good example is 6790018');
/*
    this.$node.append('input')
      .attr('type', 'button')
      .attr('value', 'Latest')
      .on('click', () => events.fire('update_table_latest', ['datasetId', 'Demo']));

    this.$node.append('input')
      .attr('type', 'button')
      .attr('value', 'Reset')
      .on('click', () => events.fire('update_table_init', ['func', 'init']));
*/
  }

  updateTableCluster() {

    const value = (<HTMLInputElement>document.getElementById('text')).value;
    if (!isNaN(+value)) {
      events.fire('update_table_cluster', ['index', value]);
    } else {
      console.log('Not a Number');
    }

  }

  updateTableSimilar() {

    const value = (<HTMLInputElement>document.getElementById('text')).value;
    if (!isNaN(+value)) {
      events.fire('update_table_similar', ['index', value]);
    } else {
      console.log('Not a Number');
    }

  }

  updateTableInfo() {
    const value = (<HTMLInputElement>document.getElementById('text_pat_id')).value;
    if (!isNaN(+value)) {
      events.fire('update_table', ['PAT_ID', value]);
      events.fire('draw_score_diagram', ['PAT_ID', value]); // TODO: try events in event as well!
    } else {
      console.log('Not a Number');
    }
  }

  addInfo() {
    const value = (<HTMLInputElement>document.getElementById('text_pat_id')).value;
    if (!isNaN(+value)) {
      events.fire('edit_score_diagram', ['PAT_ID', value]);
    } else {
      console.log('Not a Number');
    }
  }

  removeInfo() {
    const value = (<HTMLInputElement>document.getElementById('text_pat_id')).value;
    if (!isNaN(+value)) {
      events.fire('remove_score_diagram', ['PAT_ID', value]);
    } else {
      console.log('Not a Number');
    }
  }

}

export function create(parent:Element, datasetId) {
  return new QueryBox(parent, datasetId);
}

