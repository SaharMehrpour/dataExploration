/**
 * Created by Jen on 11/4/17.
 */

import * as ajax from 'phovea_core/src/ajax';
import {select, selectAll, event} from 'd3-selection';
import {values,keys,entries} from 'd3-collection';
import {type} from 'os';
import * as events from 'phovea_core/src/event';
//import {transition} from 'd3-transition';
//import {Constants} from './constants';
import * as parallel from './parallel';
import {scaleLinear,scaleTime,scaleOrdinal, scaleBand, scaleLog} from 'd3-scale';
//importing other modules from app
import * as demoGraph from './demoGraphs';
import {axisBottom} from 'd3-axis';
import {extent, min, max, ascending, histogram, mean, deviation} from 'd3-array';
import { all } from 'phovea_core/src/range';
import {brushX} from 'd3-brush';
import * as cohortStat from './cohortStat';

export class SideBar {

  private $node;
  private filters;
  private popRectScale;
  private populationDemo;
  private xScale;
  private yScale;
  private svgWidth;
  private svgHeight;
  private barBrush;
  private bmiRange;
  private cciRange;
  private ageRange;
  private bmiBrush;
  private cciBrush;
  private ageBrush;
  private distributionHeader;
  private demoform;
  private cohortKeeper;
  private selected;

      private header = [
        {'key': 'PAT_ETHNICITY', 'label': 'Ethnicity', 'value': ['W', 'H' ]},
        {'key': 'GENDER', 'label': 'Gender', 'value': ['M', 'F' ]},
        {'key': 'RACE', 'label': 'Race', 'value': ['C', 'B', 'O' ]},
        {'key': 'MARITAL_STATUS', 'label': 'Marital Status', 'value': ['M', 'W', 'S', 'D', 'U' ]},
        {'key': 'TOBACCO', 'label': 'Tobacco Use', 'value': ['Quit', 'Yes', 'NaN', 'Never' ]},
        {'key': 'ALCOHOL','label': 'Alcohol Use', 'value': ['Yes', 'No', 'Not Asked', 'NaN' ]},
        {'key': 'DRUG_USER','label': 'Drug Use', 'value': ['Yes', 'No', 'Not Asked', 'NaN' ]},
        {'key': 'DM_CODE', 'label': 'Diabetic', 'value': [250.0, 0 ]},

      ];

 
      
  constructor(parent: Element) {
    
    this.$node = select(parent);
    this.popRectScale = scaleLinear().range([0,150]);
    this.$node.append('div').attr('id', 'cohortDiv');
    this.$node.append('div').attr('id', 'filterDiv');
    this.xScale = scaleLinear();
    this.yScale = scaleLinear().range([0, 30]);
    this.svgWidth = 180;
    this.svgHeight = 50;
    
  
    this.attachListener();
  }

  private attachListener () {
    
      events.on('filter_counted', (evt, item) => {//this get the count from the group

         let allCount = item[0];
         let popCount = item[1];
         let parentValue = item[2];
     
         this.popRectScale.domain([0, allCount]);
         let selected = select('#' +parentValue);
         selected.select('text').text(popCount)
         .attr('transform', 'translate('+ this.popRectScale(popCount) +', 10)');
         selected.select('rect').transition()
         .attr('width', this.popRectScale(popCount));

       });

      events.on('population demo loaded', (evt, item)=> {

        this.populationDemo = item;
        this.distribute(item);

       });

      events.on('add_to_cohort_bar', (evt, item)=> {
        this.drawCohortLabels(item[0], item[1]);
      });

      events.on('clear_cohorts', (evt, item)=> {
        this.cohortKeeper.selectAll('div').remove();
      });

      events.on('make_stat_node', (evt, item)=> {
        let parent = document.getElementsByClassName('cohort ' + item[1])[0];
        let view = parent.querySelector('.stat_view');
        cohortStat.create(view, item[0], item[1]);
        select('.cohort.' + item[1])
      });

      events.on('update_filters', (evt, item)=> {
        this.drawCohortLabels(item[0], item[1]);
      });
      }

  async init() {

    this.buildCohortLabel();
    this.buildDemoFilter();

          }

  private buildDemoFilter() {

   // this.filters = [];
    this.bmiRange = null;
    this.cciRange = null;
    this.ageRange = null;
    
    let parents = [];
    let that = this;

    let miniLabel = this.$node.select('#filterDiv').append('div').classed('miniLabel', true);
    miniLabel.append('text').text('Demographic Filters');

    this.demoform = this.$node.select('#filterDiv').append('form');

    let labels = this.demoform.append('div').classed('labelWrapper', true).selectAll('.labelDiv')
        .data(this.header);

    let distLabel = this.demoform.append('div').classed('distributionWrapper', true);
 
    let labelsEnter = labels
        .enter()
        .append('div').classed('labelDiv', true);

    labels.exit().remove();

    labels = labelsEnter.merge(labels);

    let ul = labels.append('ul')
        .attr('value', (d=>d.key));

        let popRects = labels.append('svg').attr('width', 150).attr('height', 16).attr('id', d=>d.key);
        popRects.append('rect').attr('width', 0).attr('height', 16).attr('fill', '#AEB6BF');
        popRects.append('text').attr('fill', '#AEB6BF');

        popRects.classed('hidden', true);

        let headerLabel = ul.append('label')
        .text(function(d) {return d.label;}).attr('value', (d=>d.key));

        let listlabel = ul.selectAll('li').data((d) => {
          if(d.value != null) {return d.value};
         });
        
        let listlabelEnter = listlabel.enter().append('li');

        listlabel.exit().remove();

        listlabel = listlabelEnter.merge(listlabel);
        
        listlabel.text((d) => d);
        ul.selectAll('li').attr('value', ((d) => d));
        ul.selectAll('li').classed('hidden', true);

      headerLabel.on('click', function(d){
       
         let svgLabel = (this.parentNode.parentNode).querySelector('svg');
         let children = (this.parentNode).querySelectorAll('li');
         children.forEach(element => {
           if(element.classList.contains('hidden')) {
            element.classList.remove('hidden');
            svgLabel.classList.remove('hidden');
           }else{
            element.classList.add('hidden');
            svgLabel.classList.add('hidden');
           }
           
         });
        });

        listlabel.insert('input').attr('type', 'checkbox').attr('value', (d=>d));

        let liHover = ul.selectAll('li');
        
        liHover.on('mouseover', function(d){
          let parentValue = this.parentNode.attributes[0].value;
    
          events.fire('checkbox_hover', [parentValue, d]);
        });
        liHover.on('mouseout', function(d){
     
          select(this.parentNode.parentNode).select('rect').attr('width', 0);
          select(this.parentNode.parentNode).select('text').text(' ');
       
        });
    
        listlabel.on('click', function(d){

          let choice = d;

          let parentValue = this.parentNode.attributes[0].value;
          let parental = this.parentNode;
          if(parental.classList.contains('parent')) {
            parental.classList.remove('parent');
           }else { parental.classList.add('parent'); }

          parents.push(parental);

          let lines = select('#plotGroup').selectAll('path');
          let filterGroup = lines.filter(d => d[parentValue] == choice);

          filterGroup.classed(parentValue, true);
        });

  }

  private buildCohortLabel () {

    let that = this;

    const form = this.$node.select('#cohortDiv').append('form');

    this.cohortKeeper = form.append('div').attr('id', 'cohortKeeper').attr('height', 35);
    let createCohortButton = form.insert('input').attr('type', 'button').attr('value', 'Create Cohort');
    let deletecohortButton = form.insert('input').attr('type', 'button').attr('value', 'Clear Cohorts');

    createCohortButton.on('click', function(d){
      that.filterDemo();
      });

    deletecohortButton.on('click', () => {
      console.log('thisthing on?');
      events.fire('clear_cohorts');
  });


  }

  private async drawCohortLabels(filterKeeper, cohorts) {
        
    this.cohortKeeper.selectAll('div').remove();
    let counter = -1;
    let nodeArray = [];
    let filters = filterKeeper;

    filters.forEach((cohort, i) => {

        let cohortBox = this.cohortKeeper.append('div').classed('cohort', true).classed(i, true);
        let cohortarrow = cohortBox.append('div').classed('arrow-up', true);
        let cohortlabel = cohortBox.append('div').classed('cohort-label', true).append('text').text('Cohort  '+ (i+1) );
        let cohortCount = cohortBox.append('div').classed('cohort-label', true).append('text').text(cohorts[i].length);
        let cohortfilter;
        let label = document.getElementsByClassName('cohort ' + i);
        let statView = select(label[0]).append('div').classed('stat_view', true).classed('hidden', true);
        let view = document.getElementsByClassName('cohort ' + i)[0].querySelector('.stat_view');
        cohortStat.create(view, cohorts[i], i);

        let labelhide = true;
        cohortarrow.on('click', ()=> {
            if(labelhide) {
                statView.classed('hidden', false);
                labelhide = false;
            }else {
                    statView.classed('hidden', true);
                    labelhide = true;
                }

        });
        cohortfilter = filters[i].demo.forEach(element => {

                                        statView.append('div').classed('cohort-label', true).append('text').text(element.attributeName + ': ')
                                        element.checkedOptions.forEach(op => {
                                          statView.append('text').text(op + ', ');
                                        });
                                        statView.append('text').text(element.checkedOptions.forEach(op => {
                                            return op + ',';

                                        }));

        });


        if(filters[i].cpt != 0){
            let cptBox = statView.append('div').classed('cohort-label', true);
            cptBox.append('text').text('  CPT: ');
            filters[i].cpt.forEach(code => {cptBox.append('text').text(code[0] + "  ");

        })};

        if(filters[i].minCount != null){
            let minBox = statView.append('div').classed('cohort-label', true);
            minBox.append('text').text(' Min Score Count: '+ filters[i].minCount);

        };

        counter = counter + 1;

        cohortlabel.on('click', ()=> {
            this.selected = i;
            events.fire('cohort_selected', [cohort, i]);

        });
    });
    if(this.selected == undefined){

        let cohortLabels = this.cohortKeeper.selectAll('.cohort').nodes();
        let picked = cohortLabels[counter];
        picked.classList.add('selected');

    }else{

        let cohortLabels = this.cohortKeeper.selectAll('.cohort').nodes();
        let picked = cohortLabels[this.selected];
        picked.classList.add('selected');
    }


}


  private filterDemo(){

    let that = this;
    let filterList = [];
    that.filters = [];

         //console.log(that.bmiRange);
         let parentFilter = this.demoform.selectAll('ul.parent');

         parentFilter.each(function (element) {
   
                let filter = {
                    attributeName:(this).attributes[0].value,
                    checkedOptions: []
                   };
   
         let children = select(this).selectAll('li').selectAll('input');
   
   
         children.nodes().forEach(d => {
                if(select(d).property('checked')){
                   filter.checkedOptions.push(d['value']);
                   d['checked'] = false;
                 }
             });
   
         filterList.push(filter);
         });
   
         if(that.bmiRange != null){
           let filter = {
             attributeName: 'BMI',
             checkedOptions: that.bmiRange,
            };
           filterList.push(filter);
         }
         if(that.cciRange != null){
           let filter = {
             attributeName: 'CCI',
             checkedOptions: that.cciRange,
            };
           filterList.push(filter);
         }
         if(that.ageRange != null){
           let filter = {
             attributeName: 'AGE',
             checkedOptions: that.ageRange,
            };
           filterList.push(filter);
         }
         events.fire('cohort_made');
         events.fire('demo_filter_button_pushed', filterList);
         that.filters = [];
         filterList = [];
         that.bmiRange = null;
         that.cciRange = null;
         that.ageRange = null;
   
         that.$node.select('#BMI-Brush').call(that.bmiBrush)
         .call(that.bmiBrush.move, null);
         that.$node.select('#CCI-Brush').call(that.cciBrush)
         .call(that.cciBrush.move, null);
         that.$node.select('#AGE-Brush').call(that.ageBrush)
         .call(that.ageBrush.move, null);
   
         parentFilter.classed('parent', false);
         this.demoform.selectAll('li').classed('hidden', true);

  }

  private histogrammer(data, type, ticks){

    let totalPatients = data.length;

    let mapped = data.map((d: number)=> +d[type]);

    let maxValue = max(mapped);

   //console.log(maxValue);

 // if (type == 'BMI') mapped = mapped.filter(d => d > 0);
    let x = this.xScale.domain([0, maxValue]).nice();

    let bins = histogram()
    .domain(x.domain())
    .thresholds(x.ticks(ticks))
    (mapped);

    //return bins;
    //console.log(data);

    let histogramData = bins.map(function (d) {
      totalPatients -= d.length;
      return {x0: d.x0, x1: d.x1, length: d.length, totalPatients: totalPatients + d.length, binCount: bins.length, frequency: d.length/bins.length, name: type};
    });

    return histogramData;
  }

  private distribute(data){

    let totalPatients = data.length;

    let mappedBMI = data.map((d: number) => +d['BMI']);

    let mappedAGE = data.map((d: number) => +d['AGE']);

    let mappedCCI = data.map((d: number) => +d['CCI']);

    let BMIbins = histogram()
    .domain([0,100])
    .thresholds(10)
    (mappedBMI);

    let AGEbins = histogram()
    .domain([10,100])
    .thresholds(10)
    (mappedAGE);

    let CCIbins = histogram()
    .domain([0,23])
    .thresholds(10)
    (mappedCCI);

    let binBMI = this.histogrammer(data, 'BMI', 8);
    let binCCI = this.histogrammer(data, 'CCI', 22);
    let binAGE = this.histogrammer(data, 'AGE', 9);

   // 'scale': this.xScale.domain([0, binBMI[0].binCount])

   this.distributionHeader = [
    {'key': 'BMI', 'label': 'BMI', 'value': binBMI, 'scale': this.xScale.domain([0, binBMI[0].binCount])},
    {'key': 'CCI', 'label': 'CCI', 'value': binCCI, 'scale': this.xScale.domain([0, binCCI[0].binCount])},
    {'key': 'AGE', 'label': 'Age', 'value': binAGE, 'scale': this.xScale.domain([0, binAGE[0].binCount])}
    ];
   // console.log(this.distributionHeader);
    this.drawDistributionBands(this.distributionHeader);
    this.drawHistogram(binBMI, 'BMI');
    this.drawHistogram(binCCI, 'CCI');
    this.drawHistogram(binAGE, 'AGE');

  }

  private drawHistogram(histobins, type) {

    this.yScale.domain([0, max(histobins, function (d) {
        return d['frequency'] + .1;
    })]);

   // console.log(histobins);

    //////////////bar groups for all data////////////////////////////////
    let barGroupsALL = this.$node.select('.distributionWrapper').select('.' +type).selectAll('.barALL')
    .data(histobins);

    barGroupsALL.exit().remove();

    let barEnterALL = barGroupsALL.enter().append("g")
    .attr("class", "barALL");

    barGroupsALL = barEnterALL.merge(barGroupsALL);

    barGroupsALL
    .attr("transform", (d, i) => {
        return "translate(" +  i * this.svgWidth/d.binCount + ",0)";
    });
    barEnterALL.append("rect");

    barGroupsALL.select('rect')
    .transition(9000)
    .attr("x", 1)
    .attr("y", (d) => {
        return 30 - this.yScale(d.frequency);
    })
  
    .attr('width', d=> (this.svgWidth/d.binCount)-1)
    .attr("height", (d) => {
        return this.yScale(d.frequency);
   });


  }

  private drawDistributionBands(data) {

    let barBrush = brushX()
    .extent([[0, 0], [this.svgWidth, 30]])
    .handleSize(0);

   // let x = function(d) {return d.scale};


    let distScale = scaleLinear().domain([0, 1000]);

    let bmiScale = scaleLinear().domain([0, 100]).range([0, this.svgWidth]);
    let CCIScale = scaleLinear().domain([0, 23]).range([0, this.svgWidth]);
    let AGEScale = scaleLinear().domain([0, 100]).range([0, this.svgWidth]);

    let distLabel = this.$node.select('.distributionWrapper');
    let distDiagrams = distLabel.selectAll('.distLabel').data(data);
    let distLabelEnter = distDiagrams.enter().append('div').classed('distLabel', true);
    distDiagrams.exit().remove();
    distDiagrams = distLabelEnter.merge(distDiagrams);
    this.$node.selectAll('.distLabel').attr('height', '30');
    let ul = distDiagrams.append('ul');
    let label = ul.append('label').attr('value', (d=>d.key)).text(function(d) {return d.label;});
    let distFilter = distDiagrams.append('g').classed('distFilter', true).attr('width', this.svgWidth);

    let distSvg = distFilter.append('svg').attr('class', d=> {return d.key}).classed('distDetail_svg', true).classed('hidden', true);
    let distFilter_svg = distFilter.append('svg').classed('distFilter_svg', true).attr('width', this.svgWidth);//.classed('hidden', true)
  
    let rects = distFilter_svg.selectAll('rect').data(d => d.value).enter().append('rect').attr('width', d=> (this.svgWidth/d.binCount)-1).attr('height', 20)
    .attr('opacity', (d)=> distScale(d['length']))
    .attr('x', (d, i)=> i * this.svgWidth/d.binCount);
    //let axis = distFilter.append("g").attr("class", "axis axis--x").attr("transform", "translate(0, 10)").call(xAxis);

    let brush = distFilter_svg.append('g').attr('id', d=> {return d['key'] + '-Brush'}).classed('brush', true);
    let that = this;

    this.bmiBrush = brushX()
    .extent([[0, 0], [this.svgWidth, 30]])
    .handleSize(0)
    .on("end", () => {
      if (event.selection === null) {
        //this.setOrderScale();
    }else {
      let start = bmiScale.invert(event.selection[0]);
      let end = bmiScale.invert(event.selection[1]);
      let Dom1 = Math.floor((start+1)/10)*10;
      let Dom2 = Math.ceil((end+1)/10)*10;

      this.bmiRange = [Dom1, Dom2];
     
    }
  });

  this.cciBrush =  brushX()
  .extent([[0, 0], [this.svgWidth, 30]])
  .handleSize(0)
  .on("end", () => {
    if (event.selection === null) {

    } else {
      let start = CCIScale.invert(event.selection[0]);
      let end = CCIScale.invert(event.selection[1]);
      let Dom1 = Math.floor(start);
      let Dom2 = Math.ceil(end);
      this.cciRange = [Dom1, Dom2];
    }
  });

  this.ageBrush = brushX().extent([[0, 0], [this.svgWidth, 30]]).handleSize(0)
                  .on("end", () => {
                    if (event.selection === null) {

                    } else {
                      let start = AGEScale.invert(event.selection[0]);
                      let end = AGEScale.invert(event.selection[1]);

                      let Dom1 = Math.floor((start+1)/10)*10;
                      let Dom2 = Math.ceil((end+1)/10)*10;
                      this.ageRange = [Dom1, Dom2];
                    }
                  });
                  
  this.$node.select('#BMI-Brush').call(this.bmiBrush);

  this.$node.select('#CCI-Brush').call(this.cciBrush);
               
  this.$node.select('#AGE-Brush').call(this.ageBrush);

   label.on('click', function(d){

    let svgLabel = (this.parentNode.parentNode).querySelector('.distDetail_svg');
    if(svgLabel.classList.contains('hidden')) {
      svgLabel.classList.remove('hidden');
    }else{
      svgLabel.classList.add('hidden');
    }

   });


  }

 }

export function create(parent:Element) {
  return new SideBar(parent);
}