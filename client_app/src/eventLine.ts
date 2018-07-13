/**
 * Created by Jen Rogers on 3/22/2018.
 */
import * as ajax from 'phovea_core/src/ajax';
import {BaseType, select, selectAll, event} from 'd3-selection';
import {nest, values, keys, map, entries} from 'd3-collection';
import * as events from 'phovea_core/src/event';
import {scaleLinear, scaleTime, scaleOrdinal, scaleSqrt} from 'd3-scale';
import * as hierarchy from 'd3-hierarchy';
import {line, curveMonotoneX, curveLinear, linkHorizontal, curveMonotoneY, curveCardinal} from 'd3-shape';
import {timeParse} from 'd3-time-format';
import {extent, min, max, ascending} from 'd3-array';
import {axisBottom, axisLeft} from 'd3-axis';
import {drag} from 'd3-drag';
import * as d3 from 'd3';
import {transition} from 'd3-transition';
import {brush, brushY} from 'd3-brush';
import * as dataCalc from './dataCalculations';
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
    private startCodes;
    private scoreLabel;
    private startEventLabel;
    private eventToggleLabels;
    private branchHeight;

    constructor(parent: Element, cohort) {

    this.$node = select(parent);
    this.eventScale = scaleLinear().domain([0, 4])
            .range([0, 750]).clamp(true);

    this.circleScale = scaleLinear().domain([0, 3000])
            .range([1, 15]).clamp(true);

    this.scoreLabel = 'Absolute Scale';
    this.startEventLabel = 'Change Start to Event';
    this.branchHeight = 20;

    let branchWrapper = this.$node.append('div').classed('branch-wrapper', true);
    branchWrapper.append('svg').attr('height', this.branchHeight);
   
    this.attachListener();

    const that = this;
    this.startCodes = null;
    }

    private attachListener() {

        events.on('cohort_selected',(evt, item)=> {
            console.log('item');
        });

        events.on('branch_selected',(evt, item)=> {
            console.log('item');
        });

        events.on('test', (evt, item)=> {
            this.drawBranches(item[0]).then(d=> this.classingSelected(item[1]));
        });

        events.on('clear_cohorts', (evt, item)=> {
            let branchSvg =this.$node.select('.branch-wrapper').select('svg');;
            branchSvg.selectAll('*').remove();
           // this.$node.select('.event-buttons').remove();
        });

        events.on('update_chart', (evt, item)=> {
            console.log(item);
            this.filter = item.filterArray;

            let startEvent = item.startEvent;
            if(startEvent == null){  this.startEventLabel = 'Change Start to Event'; }else{
                this.startEventLabel = item.startEvent[1][0].key;
            }
            
            if(this.filter){

                this.drawEventButtons(item);
            }
        });

    }

    private async classingSelected(index){
            
            selectAll('.selected-group').classed('selected-group', false);

        if(index.length > 1){ 
            let selected = document.getElementsByClassName(String(index[0]) + ' cohort-lines');
            selectAll(selected).selectAll('.branches').classed('selected-group', true);
        }else{
            let selected = document.getElementsByClassName(String(index) + ' cohort-lines');
            selectAll(selected).selectAll('.event-rows').classed('selected-group', true);
        }
    }

    private async drawBranches(cohort){
    
        this.branchHeight = cohort.length * 50;
        let moveDistance = this.branchHeight / cohort.length;
        let branchWrapper = this.$node.select('.branch-wrapper');
        let branchSvg = branchWrapper.select('svg').attr('height', this.branchHeight);
        branchSvg.selectAll('*').remove();

        let rows = [];
        cohort.forEach(c => {
            let e = c.filterArray.map((event, i) => {
               let coord = {x: (i * 30.5) + 65, y: 6 };
               return coord;
            });
            rows.push(e);
            c.rowData = e;
        });

        cohort.forEach(c => {
      
          if(c.branches.length != 0){
              c.branches.forEach((b, i) => {
                  b.rowData = [{x: -25, y: -18 }, {x: -15, y: -5 }];
                  b.filterArray.forEach((event, i) => {
                      let coord = {x: (i * 30.5) + 5, y: 6 };
                      b.rowData.push(coord);
                   });
              });
          }
      });

      let linko = line().curve(curveMonotoneY)
      .x(function(d) { return d['x'] })
      .y(function(d) { return d['y'] });

        let cohorts = branchSvg.selectAll('.cohort-lines').data(cohort);
        cohorts.exit().remove();

        let coEnter = cohorts.enter().append('g').attr('class', (d, i) => i).classed('cohort-lines', true);
        cohorts = coEnter.merge(cohorts);

        cohorts.attr('transform', (d, i)=> 'translate(0,' + i * moveDistance + ')');

        let label = cohorts.append('g').classed('labels', true);
        label.append('rect').attr('width', 55).attr('height', 18).attr('fill', 'white').attr('transform', 'translate(-3, -13)');;
        label.append('text').text((d, i)=> {return 'Cohort ' + (i + 1)});
        label.attr('transform', 'translate(3, 10)');
        label.on('click', (d, i)=> {
           
            this.$node.selectAll('.selected').classed('selected', false);
            let thislabel = label.nodes();
            thislabel[i].classList.add('selected');
            events.fire('cohort_selected', [d, i]);
        });
 
        let linegroups = cohorts.append('g').classed('rows', true);//.selectAll('.rows').data(d=> d).enter().append('g').classed('rows', true);
        linegroups.append('path').attr('d', (d, i)=> linko(d.rowData)).classed('node-links', true);
        
        let cohortevents = cohorts.append('g').classed('event-rows', true).attr('transform', 'translate(60, 0)').selectAll('.events').data(d=> d.filterArray);
        cohortevents.exit().remove();

        let eventEnter = cohortevents.enter().append('g').classed('events', true);

        cohortevents = eventEnter.merge(cohortevents);
        cohortevents.attr('transform', (d, i)=> 'translate(' + i * 30 + ', 0)');

        let circle = cohortevents.append('circle').attr('cx', 5).attr('cy', 5).attr('r', 4);
        circle.on("mouseover", (d) => {
            let t = transition('t').duration(500);
            select(".tooltip")
              .html(() => {
                return this.renderOrdersTooltip(d);
              })
              .transition(t)
              .style("opacity", 1)
              .style("left", `${event.pageX + 10}px`)
              .style("top", `${event.pageY + 10}px`);
          })
          .on("mouseout", () => {
            let t = transition('t').duration(500);
            select(".tooltip").transition(t)
            .style("opacity", 0);
          });

          let nodes = cohortevents.nodes();

          let branchGroups = cohorts.selectAll('.branches').data(d=>d.branches);

          branchGroups.exit().remove();

          let benter = branchGroups.enter().append('g').classed('branches', true);

          branchGroups = benter.merge(branchGroups);

          let blabel = branchGroups.append('g').classed('b-labels', true);
          blabel.append('text').text((d, i)=> {return 'B-' + (i + 1)});
          blabel.attr('transform', 'translate(0, 10)');
          blabel.on('click', (d, i)=> {
            events.fire('branch_selected', [d.parentIndex, i]);
          });

          blabel.attr('transform', (d, i) => 'translate(-60,'+ ((i * 10) + 8) + ')');

          branchGroups.attr('transform', (d, i) => 'translate(' + ((d.eventIndex * 30) + 60) + ','+ ((i * 10) + 22) + ')');

          let branchlines = branchGroups.append('g').classed('rows', true);
          //branchlines.attr('transform', (d, i) => 'translate(' + ((d.eventIndex * 30) + 60) + ','+ ((i * 10) + 15) + ')');//.selectAll('.rows').data(d=> d).enter().append('g').classed('rows', true);
          branchlines.append('path').attr('d', (d, i)=> linko(d.rowData)).classed('node-links', true);

          let branchEvents = branchGroups.selectAll('.branch-events').data((d, i)=> d.filterArray);

          branchEvents.exit().remove();

          let branchEventsEnter = branchEvents.enter().append('g').classed('branch-events', true);
          
          branchEvents = branchEventsEnter.merge(branchEvents);

          branchEvents.attr('transform', (d, i)=> 'translate(' + i * 30 + ', 0)');

          let branchCircle = branchEvents.append('circle').attr('cx', 5).attr('cy', 5).attr('r', 4);

          branchCircle.on("mouseover", (d) => {
            let t = transition('t').duration(500);
            select(".tooltip")
              .html(() => {
                return this.renderOrdersTooltip(d);
              })
              .transition(t)
              .style("opacity", 1)
              .style("left", `${event.pageX + 10}px`)
              .style("top", `${event.pageY + 10}px`);
          })
          .on("mouseout", () => {
            let t = transition('t').duration(500);
            select(".tooltip").transition(t)
            .style("opacity", 0);
          });

    }

    private drawEventButtons(cohort){
            let filters = cohort.filterArray;
            let scaleRelative = cohort.scaleR;
            let separated = cohort.separated;
            let clumped = cohort.clumped;

            if(!scaleRelative){  this.scoreLabel = 'Absolute Scale';
            }else{ this.scoreLabel = 'Relative Scale'; }

            let that = this;

            function filText(d){
                if(d[0] !=  'Branch'){
                    if(d[0] == 'CPT'){
                        let label = d[1][1];
                        return label[0].parent;
                    }else{ 
                       
                        let label = d;
                        return label;
                    }
                }else{ console.log('Branch filter passed')};
            }
            function labelClick(d){
              
                let rec = select(d);
                    if(d == 'First Promis Score'){
                        that.startCodes = null;
                        that.startEventLabel = 'First Promis Score';
                        that.drawEventButtons(that.filter);
                        events.fire('event_selected', that.startCodes);
                        }else{
                        that.startCodes = d[1];
                        let label = d[1][1];
                        that.startEventLabel = label[0].parent;
                        that.drawEventButtons(cohort);
                        events.fire('event_selected', that.startCodes);
                    }
            }

            filters = filters.filter(d=> {return d[0] != 'Branch' && d[0] != 'demographic' && d[0] != 'Score Count'});

            filters.push(['First Promis Score']);
        
            this.$node.select('.event-buttons').remove();

            let div = this.$node.append('div').classed('event-buttons', true);
            //toggle for event day
            let startPanel = div.append('div').classed('start-event', true);
                    
            let startToggle = startPanel.append('div').classed('btn-group', true);
            startToggle.append('button').classed('btn', true).classed('btn-primary', true).classed('btn-sm', true)
                                    .append('text').text(this.startEventLabel);
    
            let startTogglebutton = startToggle.append('button')
                                        .classed('btn', true).classed('btn-primary', true).classed('btn-sm', true)
                                        .classed('dropdown-toggle', true)
                                        .attr('data-toggle', 'dropdown');
    
            startTogglebutton.append('span').classed('caret', true);
    
            let startUl = startToggle.append('ul').classed('dropdown-menu', true).attr('role', 'menu');
            
            let eventLabels = startUl.selectAll('li').data(filters).enter().append('li');
                                      
            eventLabels.append('href').append('text').text(d=> filText(d));

            eventLabels.on('click', d=> labelClick(d));
  
            //toggle for scale
            let scalePanel = div.append('div').classed('scale', true);
                    
            let scaleToggle = scalePanel.append('div').classed('btn-group', true);
            scaleToggle.append('button').classed('btn', true).classed('btn-primary', true).classed('btn-sm', true)
                                    .append('text').text(this.scoreLabel);

            
            let scaletogglebutton = scaleToggle.append('button')
                                        .classed('btn', true).classed('btn-primary', true).classed('btn-sm', true)
                                        .classed('dropdown-toggle', true)
                                        .attr('data-toggle', 'dropdown');
    
            scaletogglebutton.append('span').classed('caret', true);
    
                        let ul = scaleToggle.append('ul').classed('dropdown-menu', true).attr('role', 'menu');
                        let abs = ul.append('li').attr('class', 'choice').append('text').text('Absolute');
                        let rel = ul.append('li').attr('class', 'choice').append('text').text('Relative');//.attr('value', 'Absolute');
              
            abs.on('click', () =>{
                          //  this.scoreLabel = 'Absolute Scale';
                            this.drawEventButtons(cohort);
                           // this.drawScoreFilterBox(this.scoreBox);
                            events.fire('change_promis_scale', this.scoreLabel)});
    
            rel.on('click', () =>{
                               // this.scoreLabel = 'Relative Scale';
                                this.drawEventButtons(cohort);
                            
                                events.fire('change_promis_scale', this.scoreLabel)});
    
            let aggToggle = div.append('div').classed('aggDiv', true);
            
            let aggButton = aggToggle.append('input')
                            .attr('type', 'button').attr('id', 'aggToggle')
                            .classed('btn', true).classed('btn-primary', true).classed('btn-sm', true)
                            .attr('value', 'Aggregate Scores')
                            .on('click', () => {
                                events.fire('aggregate_button_clicked');
                            });

            if(!clumped){  aggButton.classed('btn-warning', false);  }
            else{ aggButton.classed('btn-warning', true); }
            
            let quartDiv = div.append('div').classed('quartDiv', true);
                quartDiv.append('input').attr('type', 'button').attr('id', 'quartile-btn')
                    .classed('btn', true).classed('btn-primary', true).classed('btn-sm', true)
                    .attr('value', 'Separate by Quartiles').on('click', () =>{
                        select('.checkDiv').remove();
                        events.fire('separate_aggregate');
                          ///radio aggregation
                    });
                    let checkDiv = quartDiv.append('div').attr('id', 'checkDiv')//.classed('hidden', true);
                    let tCheck = checkDiv.append('div');
                    tCheck.append('input').attr('type', 'checkbox').attr('name', 'sample').attr('id', 'sampleT').attr('checked', true)
                    .attr('value', 'top').on('click', () => {

                        let p = selectAll('.top');
                  
                        if(select("#sampleT").property("checked")){
                            p.classed('hidden', false);
                        }else{
                            p.classed('hidden', true);
                        }
                    })
                    tCheck.append('label').attr('for', 'sampleT').text('top').style('color', '#2874A6');

                    let mCheck = checkDiv.append('div');
                    mCheck.append('input').attr('type', 'checkbox').attr('name', 'sample').attr('id', 'sampleM').attr('checked', true)
                    .attr('value', 'middle').on('click', () => {
                        let p = selectAll('.middle');
                        if(select("#sampleM").property("checked")){
                            p.classed('hidden', false);
                        }else{
                            p.classed('hidden', true);
                        }
                    });
                    mCheck.append('label').attr('for', 'sampleM').text('middle').style('color', '#F7DC6F');

                    let bCheck = checkDiv.append('div');
                    bCheck.append('input').attr('type', 'checkbox').attr('name', 'sample').attr('id', 'sampleB').attr('checked', true)
                    .attr('value', 'bottom').on('click', () =>{
                        let p = selectAll('.bottom');
                        if(select("#sampleB").property("checked")){
                            p.classed('hidden', false);
                        }else{
                            p.classed('hidden', true);
                        }
                    });
                    bCheck.append('label').attr('for', 'sampleB').text('bottom').style('color', '#fc8d59');

                    if(!separated){  checkDiv.classed('hidden', true); }
                    else{ checkDiv.classed('hidden', false); }

            }

    private renderOrdersTooltip(tooltip_data) {

            let text;
            if(tooltip_data[0] == 'demographic') {
              if(tooltip_data[1].length == 0){
                text = "<strong style='color:darkslateblue'>" + 'All Patients: ' + tooltip_data[2] + "</strong></br>";
              }else{ 
                text = "<strong style='color:darkslateblue'>" + 'Demographic Filter: ' + tooltip_data[2] + "</strong></br>";
              }
            } 
            if(tooltip_data[0] == 'CPT'){ 
               
                let code = tooltip_data[1][1];
               
                text = "<strong style='color:darkslateblue'>" + code[0].parent + ': ' + tooltip_data[2] + "</strong></br>";
            } 
            if(tooltip_data[0] == 'Score Count'){ 

                text = "<strong style='color:darkslateblue'>" + tooltip_data[0] + ' > ' + tooltip_data[1] +  ' : ' + tooltip_data[2] + "</strong></br>";
            }
            if(tooltip_data[0] == 'Branch'){
                text = 'Cohort Branched';
            }
            if(tooltip_data.parentLink){ 
                text = 'Branch from Cohort at ' + tooltip_data.parentLink[1] + ' patients';
                console.log(tooltip_data); }
           
            return text;
    }


}

export function create(parent:Element, cohort) {
    return new EventLine(parent, cohort);
  }