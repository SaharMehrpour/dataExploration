/**
 * Created by saharmehrpour on 4/20/17.
 */

import * as ajax from 'phovea_core/src/ajax';
import {BaseType, select, selectAll, event} from 'd3-selection';
import {nest, values, keys, map, entries} from 'd3-collection';
import * as events from 'phovea_core/src/event';
import {scaleLinear, scaleTime, scaleOrdinal} from 'd3-scale';
import {area, line, curveMonotoneX, curveLinear} from 'd3-shape';
import {timeParse} from 'd3-time-format';
import {extent, min, max, ascending} from 'd3-array';
import {axisBottom, axisLeft} from 'd3-axis';
import {drag} from 'd3-drag';
import * as d3 from 'd3';
import * as d3Voronoi from 'd3-voronoi';
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
import { stringify } from 'querystring';


export const filteredOrders = this.filteredOrders;

export class similarityScoreDiagram {

    private $node;
    private diagram;
    private timeScale;
    private scoreScale;
    private svg;
    private brush;
    private cohortProInfo;
    private targetOrderInfo;
    private findMinDate = dataCalc.findMinDate;//function for calculating the minDate for given patient record
    private parseTime = dataCalc.parseTime;
    private setOrderScale = dataCalc.setOrderScale;
    private getClassAssignment = dataCalc.getClassAssignment;
    private orderHierarchy = dataCalc.orderHierarchy;
    private clicked;
    private cptObjectLoadedBool;

    private maxDay;
    private minDay = 0;

    private zeroEvent = 'First Promis Score';
    private targetOrder;
    private codeArray;

   filteredOrders = {
       medGroup : [],
       proGroup : [],
   };

    height = 460;
    width = 600;
    promisDimension = {height: 460, width: 700};
    margin = {x: 80, y: 40};
    private sliderWidth = 10;
    private lineScale;
    private lineOpacity;
    private eventDayBool;
    private scaleRelative = false;
    private yBrushSelection = false;

    constructor(parent: Element, diagram, cohortData, max, min) {

        const that = this;

        this.diagram = diagram;
        this.$node = select(parent)
            .append('div')
            .classed('diagramDiv', true);

       // this.drawEventButtons();
       
        this.svg = this.$node.append('svg')
            .attr('height', this.promisDimension.height)
            .attr('width', this.promisDimension.width);

        let scoreGroup = this.svg.append('g').classed('scoreGroup', true);
        let voronoiGroup = scoreGroup.append('g').classed('voronoi', true);

        let lineGroup = scoreGroup.append('g').classed('lines', true);

        // scales
        this.timeScale = scaleLinear()
            .range([0, this.promisDimension.width]);
            //.clamp(true);

        this.scoreScale = scaleLinear()
            .domain([80, 0])
            .range([0, this.promisDimension.height - 3 * this.margin.y]);//.clamp(true);

        this.lineScale = scaleLinear()
            .domain([1, 6071])
            .range([1, .2])//.clamp(true);

        this.lineOpacity = scaleLinear()
            .domain([1, 6071])
            .range([.8, .2]);//.clamp(true);

        // axis
        scoreGroup.append('g')
            .attr('class', 'xAxis')
            .attr('transform', `translate(${this.margin.x},${this.promisDimension.height - 2 * this.margin.y})`);

        scoreGroup.append('g')
            .attr('class', 'yAxis')
            .attr('transform', `translate(${(this.margin.x - this.sliderWidth)},${this.margin.y})`);

        // ----- SLIDER

        let slider = scoreGroup.append('g')
            .attr('class', 'slider')
            .attr('transform', `translate(${(this.margin.x - this.sliderWidth + 2)},${this.margin.y})`);

        this.brush = brushY()
            .extent([[0, 0], [this.sliderWidth - 2, this.scoreScale.range()[1]]])
            .on("end", () => {
                let start = that.scoreScale.invert(event.selection[0]);
                let end = that.scoreScale.invert(event.selection[1]);

                events.fire('score_domain_change', [+start, +end]);
               
            });
 
        slider.call(this.brush)
              .call(this.brush.move, this.scoreScale.range());

        slider.on('click', () => {
                if(this.yBrushSelection == true) {
                    if(this.scaleRelative == true ){
                        this.scoreScale.domain([30, -30]);
                    }else{ this.scoreScale.domain([80, 0]);}
                   
                    slider.call(this.brush)
                    .call(this.brush.move, this.scoreScale.range());
                    this.clearDiagram();
                    this.clearAggDiagram();
                    this.drawPromisChart(this.cohortProInfo, null);
                    this.yBrushSelection = false;
                }
            });
        // -----

        scoreGroup.append('text')
            .text(`${this.diagram}`)
            .attr('text-anchor', 'middle')
            .attr('transform', `translate(${this.margin.x / 4},${this.promisDimension.height * 0.5}) rotate(-90)`);

        scoreGroup.append('g')
            .attr('class', 'grid')
            .attr('transform', `translate(${this.margin.x},${this.margin.y})`)
            .call(axisLeft(this.scoreScale)
                .tickSize(-(this.promisDimension.width - this.margin.x))
            )
            .selectAll('text').remove();

        this.attachListener();
    }

    /**
     * Attach listeners
     */
    private attachListener() {
        //this is in plotkeeper
        events.on('draw_aggs', (evt, item)=> {
            if(item != null){
               
                this.clearDiagram();
                this.frequencyTest(item[0], 'top');
                this.frequencyTest(item[1], 'middle');
                this.frequencyTest(item[2], 'bottom');
               
            }else {  
                this.clearDiagram();
                this.frequencyTest(this.cohortProInfo, 'all'); }
           });

        events.on('change_promis_scale', (evt, item)=>{
            
            if(item == 'Relative Scale'){
                this.scaleRelative = true;
                this.interpolate(this.cohortProInfo).then(c=> {
                    events.fire('cohort_interpolated', c);
                    this.changeScale(c);
         });;
            }
            if(item == 'Absolute Scale'){
                this.scaleRelative = false;
                this.changeScale(this.cohortProInfo);
            }
  
        });

        events.on('clear_clumpin', ()=>{
            this.clearAggDiagram();
        });

        events.on('draw_plot', (evt, item)=> {
            this.clearDiagram();
            if(item == null){  
                this.drawPromisChart(this.cohortProInfo, 'proLine');
            }else{
                this.drawPromisChart(item[0], 'top');
                this.drawPromisChart(item[1], 'middle');
                this.drawPromisChart(item[2], 'bottom');
            }

        });

        events.on('score_domain_change', (evt, item)=>{
            this.scoreScale.domain(item);
            this.clearDiagram();
            this.drawPromisChart(this.cohortProInfo, 'proLine');
            this.yBrushSelection = true;
        });

        events.on('filtered_by_quant', (evt, item)=> {
            this.cohortProInfo = item[0];
            this.clearDiagram();
            this.drawPromisChart(this.cohortProInfo, 'proLine');
        });

        events.on('separated_by_quant', (evt, item)=> {
            this.clearDiagram();
            this.clearAggDiagram();
           
            this.drawPromisChart(item[0], 'top');
            this.drawPromisChart(item[1], 'middle');
            this.drawPromisChart(item[2], 'bottom');
        });

        events.on('filtered_by_count', (evt, item)=> {
            this.cohortProInfo = item[0];
            this.clearDiagram();
            this.clearAggDiagram();
            this.drawPromisChart(this.cohortProInfo, 'proLine');
        });

        events.on('event_selected', (evt, item)=> {
            console.log(item);
            if(item == null){
                this.targetOrder = 'First Promis Score';
            }else{
                this.targetOrder = item[1];
            }
           
            this.$node.select('#eventLabel').text(this.targetOrder);
        });

        events.on('update_start_button_clicked', (evt, item)=> {
            console.log(item);
      
            this.clearDiagram();
            this.clearAggDiagram();
            if(item == null){
                
               this.zeroEvent = 'First Promis Score';
           
                this.getDays(null);
                this.eventDayBool = false;
                this.getBaselines(this.cohortProInfo);
                if(this.scaleRelative){
                    this.scaleRelative = false;
                    this.interpolate(this.cohortProInfo).then(c=> {
                        events.fire('cohort_interpolated', c);
                        this.changeScale(c);
             });
                      }
            }else{
                let cohort = item[0];
                let event = item[1];
                this.zeroEvent = event[1][0].key;
                this.getDays(cohort);
                this.eventDayBool = true;
                //this.getBaselines(this.cohortProInfo);
                this.getBaselines(cohort).then(d=> {
                    this.interpolate(d).then(c=> {
                               events.fire('cohort_interpolated', c);
                               this.changeScale(c);
                    });
                });
                
            }
            this.$node.select('.zeroLine').select('text').text(this.zeroEvent);
            events.fire('send_stats');
        });

        events.on('filter_cohort_by_event', (evt, item)=> {
            this.targetOrder = item[1];
        });

        events.on('domain updated', (evt, item)=> {
            this.maxDay = item[1];
            this.minDay = item[0];
            if(this.cohortProInfo != undefined){
                this.clearDiagram();
                this.clearAggDiagram();
                this.drawPromisChart(this.cohortProInfo, 'proLine');
            }
        });

        events.on('selected_cohort_change', (evt, item) => {  // called in parrallel on brush and 
            this.cohortProInfo = item;
            this.clearDiagram();
            this.clearAggDiagram();
            this.getDays(null);
            if(this.scaleRelative){
                this.scaleRelative = false;
                this.interpolate(this.cohortProInfo).then(c=> {
                   // events.fire('cohort_interpolated', c);
                   // this.changeScale(c);
         });
                  }
                    });

        events.on('revert_to_promis', () =>{
            this.targetOrder = 'First Promis Score';

        });
        
        events.on('selected_event_filter_change', (evt, item)=> {
            this.codeArray = item;
        });

        events.on('min_day_added', (evt, item)=> {
            this.cohortProInfo = item;
        });

    }

    private getDays(date) {

      if(this.cohortProInfo != null)  {
      
 // ----- add diff days to the data
          
            let maxDiff = 0;// this sets the score scale max.
            //need to make this dynamic. 
            let diffArray = [];
            if (this.cohortProInfo != null) {

                this.cohortProInfo.forEach((g) => {
                    let  minDate;
                   
                    if(g.CPTtime != undefined && date != null ) {
                        minDate = this.parseTime(g.CPTtime, null);
                      
                    }else minDate = g.min_date;
                //these have already been parsed
                let maxDate = g.max_date;
                            g.value.forEach((d) => {
                            try {
                            d.diff = Math.ceil((this.parseTime(d['ASSESSMENT_START_DTM'], null).getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
                            maxDiff = d.diff > maxDiff ? d.diff : maxDiff;
                            }
                            catch (typeError) {
                            d.diff = -1;
                            }
                            });
                            g.days = (Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))) + 1;
                            diffArray.push(g.days + 1);

                            g.value.sort((a, b) => ascending(a.diff, b.diff));

                            });
            }else{console.log('error'); }
           
            diffArray.sort((a, b) => ascending(a, b));
            events.fire('timeline_max_set', max(diffArray));
            events.fire('day_dist', this.cohortProInfo);
            if(this.maxDay != undefined){
                this.drawPromisChart(this.cohortProInfo, 'proLine');
            }
        }
    }
//breaks each pat value scores into Original and relative score
    private async getBaselines(cohort)  {

        cohort.forEach(patient => {
            let negative = 0;
            let positive = 0;
            let zeroValue = false;
            let negMin;
            let posMin;
            let absMin;

            patient.value.forEach((value) => {
                if(value.diff < 0) { negative = negative + 1;    }
                if(value.diff > 0) { positive = positive + 1;    }
                if(value.diff == Math.abs(0)) {
                    zeroValue = true;
                    value.diff = 0;   }
            });

            absMin = patient.value[0].diff;
            let baseStart;
            let baseEnd;
            let baseline;
            patient.window = {'neg' : null, 'pos': null };

            if(negative == 0){ negMin = null; posMin = 6000;
            }else if(positive == 0){ posMin = null; negMin = patient.value[0].diff;
            }else {
                negMin = patient.value[0].diff;
                posMin = 6000;
            }
            if(zeroValue)  {
               
                posMin = 0;
                negMin = 0;
                absMin = 0;
            }

            patient.value.forEach(value => {
                if(absMin != 0) {
                //if(value.diff != Math.abs(0)){
                    if(value.diff < 0) {
                        if(negMin != null) {
                            if(Math.abs(value.diff) < Math.abs(negMin)) {

                                negMin = value.diff;
                            }};
                        }
                    if(value.diff > 0) {
                        if(posMin != null) {
                        if(value.diff < posMin) {
                        posMin = value.diff;
                        }};
                    }}

                if(absMin != 0) {
                    if(Math.abs(value.diff) < Math.abs(absMin)) {
                        absMin = +value.diff;
                            };
                }else {

                }

                if(value.diff == absMin) {baseline = value.SCORE; };
                if(value.diff == negMin) {baseStart = value.SCORE; };
                if(value.diff == posMin) {baseEnd = value.SCORE; };

            });

         patient.value.forEach((value) => {
             if(posMin == null || negMin == null) {
                 patient.window = null;
                
                 value.ogScore = value.SCORE;
                 value.relScore = value.SCORE - baseline;
   
             }else {
                value.window = {'neg': [negMin, baseStart], 'pos': [posMin, baseEnd]};
                patient.window = {'neg': [negMin, baseStart], 'pos': [posMin, baseEnd]};
                value.ogScore = value.SCORE;
                value.relScore = value.SCORE - baseline;
             }

         });
        });

        return cohort;
    }
    //estimates 
    private async interpolate(cohort) {

     cohort.forEach(pat => {
            let b;
            if(pat.window != null && pat.window != undefined) {
                
               if((pat.window.neg[0] == Math.abs(0)) || (pat.window.pos[0] == Math.abs(0))) {
                
                   if(pat.window.neg[0] == 0){b = pat.window.neg[1]; }
                   if(pat.window.pos[0] == 0){b = pat.window.pos[1]; }
               }else{
                    let x1 = pat.window.neg[0];
                    let x2 = pat.window.pos[0];
                    let y1 = pat.window.neg[1];
                    let y2 = pat.window.pos[1];
                    let X;
                    let Y;

                    if (x1 < x2){X = x1; Y = y1;}
                    else {X = x2; Y = y2;};

                    let slope = (y2 - y1) / (x2 - x1);
                    b = Y - (slope * X);
                    pat.slope = slope;
                    pat.b = +b;
               }

                pat.value.forEach((value) => {
                    value.b = b;
                    value.relScore = value.ogScore - b;

                });

            }else{

                b = pat.value[0].SCORE;
                pat.value.forEach((value) => {
                    value.ogScore = value.SCORE;
                    value.b = b;
                    value.relScore = value.ogScore - b;
                });

            }

        });
        console.log(cohort);
        this.cohortProInfo = cohort;
       
       // events.fire('cohort_interpolated', cohort);
       // this.changeScale(cohort);
        return cohort;
    }

    private changeScale(cohort) {
      
        if(this.scaleRelative)  {
            this.scoreScale.domain([30, -30]);
            this.cohortProInfo.forEach(patient => {
                patient.value.forEach(value => {
                    value.SCORE = +value.relScore;
                });
            });
            };
        if(!this.scaleRelative) {
            this.scoreScale.domain([80, 0]);
            this.cohortProInfo.forEach(patient => {
                patient.value.forEach(value => {
                    value.SCORE = +value.ogScore;
                });
            });
        };
        this.clearDiagram();
        this.clearAggDiagram();
        this.drawPromisChart(this.cohortProInfo, 'proLine');

    }
    /**
     * Draw the diagram with the given data from getSimilarRows
     * @param args
     */
    private drawPromisChart(cohort, clump) {
           
            if(this.scaleRelative){

                const promisScoreGroup = this.svg.select('.scoreGroup');
                let zeroLine = promisScoreGroup.append('g').classed('zeroLine', true)
                .attr('transform', () => `translate(${this.margin.x},${this.margin.y})`);

                zeroLine.append('line')
                        .attr('x1', 0).attr('x2', 670)
                        .attr('y1', this.scoreScale(0)).attr('y2', this.scoreScale(0)).attr('stroke-width', .5)
                        .attr('stroke', '#E67E22');
            }

            let lineCount = cohort.length;

            let co = cohort.filter(g=> {return g.value.length > 1; });

            let similarData = co.map((d) => {
                let data = {key: d.key, value: null, line: null};
                let res = d.value.filter((g) => {//this is redundant for now because promis physical function already filtered
                return g['FORM'] == this.diagram;
                });
                res.sort((a, b) => ascending(a.diff, b.diff));
                res.forEach(r=> r.maxday = d.days);
                res = res.map((r, i)=> {return {
                                            PAT_ID: r.PAT_ID,
                                            diff: r.diff,
                                            SCORE: r.SCORE,
                                            pat : data
                                            };
                                        });
                data.value = res;
                return data;
            });

            function vorline(d) { return d ? 'M' + d.join('L') + 'Z' : null; };
          
            // -----  set domains and axis
            // time scale
            this.timeScale.domain([this.minDay, this.maxDay]);

            this.svg.select('.xAxis')
                .call(axisBottom(this.timeScale));

            this.svg.select('.yAxis')
                .call(axisLeft(this.scoreScale));
            // -------  define line function
            const lineFunc = line()
                .curve(curveLinear)
                .x((d) => { return this.timeScale(+d['diff']); })
                .y((d) => { return this.scoreScale(+d['SCORE']); });

            // ------- draw
            const promisScoreGroup = this.svg.select('.scoreGroup');

            promisScoreGroup.append('clipPath').attr('id', 'clip')
            .append('rect')
            .attr('width', 850)
            .attr('height', this.height - 20);
 
            let that = this;

            let voronoiGroup = this.svg.select('.voronoi')
                .attr('transform', () => {
                    return `translate(${this.margin.x},${this.margin.y})`;
                });

                let lines = promisScoreGroup.select('.lines')
            //let lines = promisScoreGroup.append('g').classed('lines', true)//.classed(clump, true)
                    .attr('transform', () => {
                    return `translate(${this.margin.x},${this.margin.y})`;
                })   .attr('clip-path','url(#clip)')
                     .selectAll('.'+ clump)
                        .data(similarData)
                        .enter().append('g').attr('class', d=> d['key'])
                        .classed(clump, true)
                        .append('path')
                        .attr('class', d=> d['key'])
                        .classed(clump, true)
                        .attr('stroke-width', that.lineScale(lineCount))
                        .attr('stroke-opacity', that.lineScale(lineCount))
                        .attr('d', function (d) {
                                    d['line'] = this;
                                    return lineFunc(d.value);})
                        .on('click', function (d) { voronoiClicked(d); } )
                        .on('mouseover', (d)=> this.addPromisDotsHover(d))
                        .on('mouseout', (d)=> this.removeDots());

                if(cohort.length < 500) { 

                    if(clump == 'proLine') {

                        let fakePatArray = [];
                        lines.nodes().forEach((l, i) => {
                            let fakeArray = [];
                            let bins = Math.floor(l.getTotalLength()/25);

                            for(let i = 0; i < bins; i++) {
                                let p = l.getPointAtLength(i * 25);
                                fakeArray.push({x: p.x, y: p.y, pat: l.__data__});
                            }
                            similarData[i].fakeArray = fakeArray;
                        });

                        let voronoi = d3Voronoi.voronoi()
                        .x((d, i) => { return d.x })
                        .y((d, i) => { return d.y })
                        .extent([[0, 0], [850, 350]]);

                        voronoiGroup.selectAll('g')
                        .data(voronoi.polygons(d3.merge(similarData.map(function(d) { 
                            return d.fakeArray; }))))
                            .enter().append('g')
                            .append('path')
                            .attr('d', function(d,i){return d ? 'M' + d.join('L') + 'Z' : null;})
                            .attr("class", function(d,i) { return "voronoi-" + i; })
                            .style("fill", "none")
                            .style('pointer-events', 'all')
                            .on('mouseover', mouseover)
                            .on('mouseout', mouseout)
                            .on('click', (d)=>  voronoiClicked(d.data.pat));
                    }
}
               let zeroLine = promisScoreGroup.append('g').classed('zeroLine', true)
                    .attr('transform', () => `translate(${this.margin.x},${this.margin.y})`);

               zeroLine.append('line')
                    .attr('x1', this.timeScale(0)).attr('x2', this.timeScale(0))
                    .attr('y1', 0).attr('y2', 345).attr('stroke-width', .5).attr('stroke', '#E67E22');
                zeroLine.append('text').text(this.zeroEvent).attr('x', this.timeScale(0));

                function mouseover(d) {
                    let group = d.data.pat.line;
                    select(group).classed('hover-selected', true);
                  }
                
                function mouseout(d) {
                    let group = d.data.pat.line;
                    select(group).classed('hover-selected', false);
                  }

                  function voronoiClicked(d) {
          
                    let line = d.line;
                    if(line.classList.contains('selected')) {
                        line.classList.remove('selected');
                        let dots = document.getElementsByClassName([d.key] + '-clickdots');
                        for (var i = dots.length; i--; ) {
                            dots[i].remove();
                         }
                       events.fire('line_unclicked', d);
                    }else {
                        line.classList.add('selected');
                        that.addPromisDotsClick(d);
                        events.fire('line_clicked', d);
                };
                    let lines = that.$node.select('.lines').selectAll('.selected').nodes();
                 
                    let idarray = [];
                    lines.forEach(element => {
                            idarray.push(+element.__data__.key);
                        });
                        events.fire('selected_line_array', idarray);
                    }
        }

    private addPromisDotsHover (d) {

            let promisData = d;

            let promisRect = this.svg.select('.scoreGroup').select('.lines');
            let dots = promisRect
            .selectAll('circle').data(promisData);
            dots.enter().append('circle').attr('class', 'hoverdots')
            .attr('cx', (d, i)=> this.timeScale(d.diff))
            .attr('cy', (d)=> {
                let score; 
                score = d.SCORE;
                return this.scoreScale(score);
            }).attr('r', 5).attr('fill', '#21618C');
    
            dots.append('circle').attr('cx', ()=> this.timeScale(0))
            .attr('cy', (d)=> this.scoreScale(d.b[0])).attr('r', 5).attr('fill', 'red');

    }

    private addPromisDotsClick (d) {

        let n = select(d.line).node();
        let parent = n.parentNode;

        let promisData = d.value;
       
      
        let dots = select(parent)
        .selectAll('circle').data(promisData);
        dots.enter().append('circle').attr('class', d.key + '-clickdots')
        .classed('clickdots', true)
        .attr('cx', (d, i)=> this.timeScale(d['diff']))
        .attr('cy', (d)=> {
            let score; 
            score = d['SCORE'];
            return this.scoreScale(score);
        }).attr('r', 5).attr('fill', '#FF5733');

        this.clicked = true;

}

    private removeDots () {
        selectAll('.hoverdots').remove();
    }

        /**
     * Utility method
     * @param start
     * @param end
     */
    private updateSlider(start, end) {

        let lowScore = this.scoreScale.invert(end);
        let highScore = this.scoreScale.invert(start);

        let med = this.svg.select('.scoreGroup')
            .selectAll('path')
            .style('opacity', 0);

        med.filter(function (d) {
            if (!d.length) return false;
            return d[0].SCORE <= highScore && d[0].SCORE >= lowScore;
        }).style('opacity', 1);

    }
    /**
     * clear the diagram
     */
    private clearDiagram() {

        this.svg.select('.scoreGroup').select('.lines').selectAll('*').remove();
        this.svg.select('.scoreGroup').selectAll('.zeroLine').remove();
        this.svg.select('.scoreGroup').select('.voronoi').selectAll('*').remove();
        this.svg.select('.scoreGroup').selectAll('#clip').remove();
    }
        /**
     * clear the diagram
     */
    private clearAggDiagram() {

        let aggline =  this.svg.select('.scoreGroup');
        aggline.select('.avLine').remove();
        aggline.select('.avLine_all').remove();
        aggline.select('.avLine_top').remove();
        aggline.select('.avLine_middle').remove();
        aggline.select('.avLine_bottom').remove();
        aggline.selectAll('.stLine_all').remove();
        aggline.selectAll('.stLine_top').remove();
        aggline.selectAll('.stLine_middle').remove();
        aggline.selectAll('.stLine_bottom').remove();
        aggline.selectAll('.qLine_all').remove();
        aggline.selectAll('.qLine_top').remove();
        aggline.selectAll('.qLine_middle').remove();
        aggline.selectAll('.qLine_bottom').remove();
    }

    // creates bin array for each patient scores and calulates slope for each bin
    //TODO : get rid of test in name and global variables?
    private frequencyTest(cohort, clump){
        let cohortFiltered = cohort.filter(d=> d.value.length > 1);

        let negdiff = 0;
        let posdiff = 0;

        //get the extreme diff values for each side of the zero event
        cohortFiltered.forEach(pat => {

            let patDiffArray = pat.value.map(d=> +d.diff);
            let patneg = d3.min(patDiffArray);
            let patpos = d3.max(patDiffArray);

            if(patneg < negdiff) {negdiff = patneg;  };
            if(patpos > posdiff) {posdiff = patpos;  };
   
        });
        negdiff = Math.round(negdiff / 10) * 10;
        posdiff = Math.round(posdiff / 10) * 10;
        //get diff of days between maxneg diff and maxpos diff
        let daydiff = posdiff - negdiff;
        let bincount = Math.floor(daydiff/10);

        cohortFiltered.forEach(pat=> {

            for (let i = 1; i < pat.value.length; i++) {

                if(pat.value[i] != undefined) {

                        let x1 = pat.value[i-1].diff;
                        let x2 = pat.value[i].diff;
                        let y1 = pat.value[i-1].SCORE;
                        let y2 = pat.value[i].SCORE;

                        pat.value[i].calc = [[x1, y1],[x2, y2]];

                        let slope = (y2 - y1) / (x2 - x1);

                        pat.value[i].slope = slope;
                        pat.value[i].b = y1 - (slope * x1);
                }
            }

            pat.bins = [];

            pat.bins.push({'x': negdiff, 'y': null});
            for (let i = 1; i < bincount; i++) {
               let diffplus = negdiff + (i * 10);
               pat.bins.push({'x': diffplus, 'y': null});
            }
            
            let patstart = pat.value[0].diff;
            patstart = Math.ceil(patstart / 10)* 10;
            let patend = pat.value[pat.value.length-1].diff;
            patend = Math.ceil(patend/10)* 10;
          
            let first = pat.bins.find((v)=> v.x == patstart);
            let last = pat.bins.find((v)=> v.x == patend);

            if(first != undefined){
    
                const startIndex = pat.bins.indexOf(first);
                first.y = pat.value[0].SCORE; }

            if(last != undefined){
        
                last.y = pat.value[pat.value.length-1].SCORE; }


            for(let i = pat.bins.indexOf(first); i < pat.bins.indexOf(last); i ++){
              
                let x = pat.bins[i].x;
              
                    pat.bins[i].topvalue = pat.value.find((v)=> v.diff > pat.bins[i].x);
                        let top = pat.value.find((v)=> v.diff > x);
                
                        if(top != undefined){
                  
                         pat.bins[i].y = (top.slope * x) + top.b;
                         };
            }
        });
       
        this.drawAgg(cohortFiltered, clump);

    }
    //draws the lines for the mean and standard deviation for the PROMIS scores
    private drawAgg(cohort, clump){

        let patbin = cohort.map((d)=> {
        
        let bin = d.bins;
    
        return bin;
        });
 
        let means = [];
        let devs = [];
        
        for(let i = 0; i < patbin[0].length; i++){
            let mean = d3.mean(patbin.map(d => d[i].y));
            let x = d3.mean(patbin.map(d => d[i].x));
            let dev =  d3.deviation(patbin.map(d => d[i].y));
            means.push([x, mean]);
            devs.push(dev);
        }

        let botdev = means.map((d, i)=> {
            let y = d[1] - devs[i];
            let x = d[0];

            return [x, y];
        });

        let topdev = means.map((d, i)=> {
            
           let y = d[1] + devs[i];
           let x = d[0];

           return [x, y];
        
        });

        let quart = means.map((d, i)=> {
            
            let x = d[0];
            let y1 = d[1] + devs[i];
            let y2 = d[1] - devs[i];
 
            return [x, y1, y2];
         
         });

        quart[0] = [means[0][0], quart[1][1], quart[1][2]];
        let quart2 = [];
         
         quart.forEach(d=> {
            let arr = [];
            d.forEach(q=> {
                //let val = [];
                if (isNaN(q)) {
                   arr.push(45);
                  }else{arr.push(q); }
            });
            quart2.push(arr);
        });

         botdev[0] = [means[0][0], botdev[1][1]];
         let botdev2 = [];
         
         botdev.forEach(d=> {
            let arr = [];
            d.forEach(q=> {
                //let val = [];
                if (isNaN(q)) {
                   arr.push(45);
                  }else{arr.push(q); }
            });
            botdev2.push(arr);
        });

         topdev[0] = [means[0][0], topdev[1][1]];

         let topdev2 = [];
         
         topdev.forEach(d=> {
            let arr = [];
            d.forEach(q=> {
                //let val = [];
                if (isNaN(q)) {
                   arr.push(45);
                  }else{arr.push(q); }
            });
            topdev2.push(arr);
        });

        let lineCount = cohort.length;

        let data = means;
        // -----  set domains and axis
        // time scale
        this.timeScale.domain([this.minDay, this.maxDay]);

        this.svg.select('.xAxis')
            .call(axisBottom(this.timeScale));

        this.svg.select('.yAxis')
            .call(axisLeft(this.scoreScale));
        // -------  define line function
        const lineFunc = line()
            .curve(curveLinear)
            .x((d, i) => { return this.timeScale(+d[0]); })
            .y((d) => { return this.scoreScale(+d[1]); });

        // -------- line function for quartiles 
        
        const drawPaths = area()
              .x(d => { return this.timeScale(+d[0]); })
              .y0(d => { return this.scoreScale(+d[2]); })
              .y1(d => { return this.scoreScale(+d[1]); });
        

        // ------- draw
        const promisScoreGroup = this.svg.select('.scoreGroup');

        promisScoreGroup.append('clipPath').attr('id', 'clip')
        .append('rect')
        .attr('width', 850)
        .attr('height', this.height - 20);

        let that = this;
       
        let group = promisScoreGroup.append('g').classed(clump, true);

            group
            .append('path')
            .classed('qLine_' + clump, true)
            .attr('clip-path','url(#clip)')
            .data([quart2])
            .attr('d', drawPaths)
            .attr('transform', () => {
                return `translate(${this.margin.x},${this.margin.y})`;
            });

            group
            .append('path')
            .classed('avLine_' + clump, true)
            .attr('clip-path','url(#clip)')
            .data([data])
            .attr('d', lineFunc)
            .attr('transform', () => {
                return `translate(${this.margin.x},${this.margin.y})`;
            });

            group
            .append('path')
            .classed('stLine_' + clump, true)
            .attr('clip-path','url(#clip)')
            .data([topdev2])
            .attr('d', lineFunc)
            .attr('transform', () => {
                return `translate(${this.margin.x},${this.margin.y})`;
            });

            group
            .append('path')
            .classed('stLine_' + clump, true)
            .attr('clip-path','url(#clip)')
            .data([botdev2])
            .attr('d', lineFunc)
            .attr('transform', () => {
                return `translate(${this.margin.x},${this.margin.y})`;
            });

            let zeroLine = promisScoreGroup.append('g').classed('zeroLine', true)
            .attr('transform', () => `translate(${this.margin.x},${this.margin.y})`);

            zeroLine.append('line')//.attr('class', 'myLine')
                    .attr('x1', this.timeScale(0)).attr('x2', this.timeScale(0))
                    .attr('y1', 0).attr('y2', 345).attr('stroke-width', .5).attr('stroke', '#E67E22');
            zeroLine.append('text').text(this.zeroEvent).attr('x', this.timeScale(0));
    }

    /**
     * Get the data via API
     * @param URL
     * @returns {Promise<any>}
     */
    private async getData(URL) {
        return await ajax.getAPIJSON(URL);
    }


    private renderOrdersTooltip(tooltip_data) {

        let text = "<strong style='color:darkslateblue'>" + tooltip_data['ORDER_CATALOG_TYPE'] + "</strong></br>";
        text += '<span>' + tooltip_data['ORDER_MNEMONIC'] + '</span></br>';
        text += '<span>' + tooltip_data['ORDER_DTM'] + '</span></br>';
        return text;
    }

    /**
     * Show or hide the application loading indicator
     * @param isBusy
     */
    setBusy(isBusy: boolean) {
        let status = select('.busy').classed('hidden');
        if (status == isBusy)
            select('.busy').classed('hidden', !isBusy);
    }

}

export let targetPatientOrders;


export function create(parent: Element, diagram, cohortData, max, min) {
    return new similarityScoreDiagram(parent, diagram, cohortData, max, min);
}