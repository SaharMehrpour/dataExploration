/**
 * Created by Jen Rogers on 3/22/2018.
 */
import * as ajax from 'phovea_core/src/ajax';
import {BaseType, select, selectAll, event} from 'd3-selection';
import {nest, values, keys, map, entries} from 'd3-collection';
import * as events from 'phovea_core/src/event';
import {scaleLinear, scaleTime, scaleOrdinal} from 'd3-scale';
import {line, curveMonotoneX, curveLinear} from 'd3-shape';
import {timeParse} from 'd3-time-format';
import {extent, min, max, ascending} from 'd3-array';
import {axisBottom, axisLeft} from 'd3-axis';
import {drag} from 'd3-drag';
import * as d3 from 'd3';
//import {Constants} from './constants';
import {transition} from 'd3-transition';
import {brush, brushY} from 'd3-brush';
import * as dataCalc from './dataCalculations';
import * as dataManager from './dataManager';
import {ITable, asTable} from 'phovea_core/src/table';
import {IAnyVector, INumericalVector} from 'phovea_core/src/vector';
import {list as listData, getFirstByName, get as getById} from 'phovea_core/src/data';
import {range, list, join, Range, Range1D, all} from 'phovea_core/src/range';
import {asVector} from 'phovea_core/src/vector/Vector';
import {argFilter} from 'phovea_core/src/';

export class EventLine {
    private $node;
    private eventScale;
    private circleScale;
    private filter;


    constructor(parent: Element, cohort) {

    this.$node = select(parent);
    this.eventScale = scaleLinear().domain([0, 4])
            .range([0, 750]).clamp(true);

    this.circleScale = scaleLinear().domain([0, 3000])
            .range([1, 15]).clamp(true);

    this.attachListener();
    this.drawLine();

    }

    private attachListener() {
        events.on('update_event_line', (evt, item)=> {
           console.log('update event filter line');
      
        });

        events.on('send_filter_to_codebar', (evt, item)=> {
            this.updateEvents(item);
        });
    }

    private drawLine(){
        let eventLine = this.$node;
        let eventLineSvg = eventLine.append('svg').classed('event_line_svg', true)
        .attr('height', 50).attr('width', 710);

    }

    private updateEvents(filters) {

        function filText(d){
            if(d[0] == 'demographic'){return 'First Promis Score'}else{
                let label = d[1][1];
                return label[0].parent;
            }
        }

        function labelClick(d){
       
                if(d[0] == 'demographic'){
                    events.fire('revert_to_promis');
                    console.log('first promis score')}else{
                    events.fire('event_clicked', d[1]);
                }
        }


        let that = this;
        let svg = this.$node.select('.event_line_svg');
        
        svg.selectAll('.event_label').remove();

        let events = svg.selectAll('.event_label').data(filters);
        events.exit().remove();
        let eventsEnter = events.enter().append('g').classed('event_label', true);

        events = eventsEnter.merge(events);
       
        events.attr('transform', (d, i) => `translate(${(i * 82)}, 0)`);
        let rect = events.append('rect');
        let text = events.append('text').text(d=> filText(d)).attr('transform', 'translate(5,15)');
        events.on('click', d=> labelClick(d));
        }

}

export function create(parent:Element, cohort) {
    return new EventLine(parent, cohort);
  }