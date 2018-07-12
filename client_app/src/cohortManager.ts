/**
 * Created by Jen Rogers on 1/29/18.
 * cohortkeeper to keep all those cohorts.
 */
import * as ajax from 'phovea_core/src/ajax';
import {list as listData, getFirstByName, get as getById} from 'phovea_core/src/data';
import * as events from 'phovea_core/src/event';
import {nest, values, keys, map, entries} from 'd3-collection';
import * as d3 from 'd3';
import * as dataCalculations from './dataCalculations';
import * as codeDict from './cptDictionary';

class Cohort {

        label: string; 
        eventIndex: any;
        parentIndex: any;
        promis: any;
        cpt: any;
        filterArray: any;
        promisSep: any;
        promisAgg: any;
        separated: any;
        clumped: any;
        scaleR: boolean;
        startEvent: any;
        branches: any;

        constructor() {
            this.promisSep = null;
            this.promisAgg = null;
            this.separated = null;
            this.clumped = false;
            this.scaleR = false;
            this.startEvent = null;
            this.branches = [];
            this.parentIndex = null;
            this.filterArray = [];
        }

    }

export class CohortManager {

    cohortIdArray;//array of ids for defined patients
    cohortIndex = 0;
    selectedCohort;//this is going to be the selected cohort from the cohort keeper array
    cptCodes;
    codes;
    cohortCompareArray = [];
    branchSelected;
    cohortTree = [];
    comparisonBool;
    layerBool
    initialCohort;

    constructor() {
        this.codes = codeDict.create();
        this.branchSelected = null;
        
        this.attachListener();
    }

    private attachListener(){

        events.on('add_layer_to_filter_array', (evt, item) => { // called in sidebar
                let filterReq = ['demographic', item[0], item[1]];
              
                if(this.branchSelected == null){
                    this.cohortTree[this.cohortIndex].filterArray.push(filterReq);
                    events.fire('send_filter_to_codebar', this.cohortTree[this.cohortIndex].filterArray);
                    events.fire('test', [this.cohortTree, [this.cohortIndex]]);
                }else{
                    this.cohortTree[this.cohortIndex].branches[this.branchSelected[1]].filterArray.push(filterReq);
                    events.fire('send_filter_to_codebar', this.cohortTree[this.cohortIndex].branches[this.branchSelected[1]].filterArray);
                    events.fire('test', [this.cohortTree, [this.branchSelected]]);
                }
        });
    

        events.on('aggregate_button_clicked', ()=> {
            
            let clumped = this.selectedCohort.clumped;
            if(clumped){
                clumped = false;
                this.selectedCohort.clumped = false;
               // document.getElementById('aggToggle').classList.remove('btn-warning');
                
            }else{
             
                clumped = true;
                this.selectedCohort.clumped = true;
              //  document.getElementById('aggToggle').classList.add('btn-warning');
            }
            
            events.fire('update_chart', this.selectedCohort);
            });

        events.on('branch_cohort', ()=> {

            let branch;
            if(this.cohortTree[this.cohortIndex].branches.length == 0){
              
                branch = [];
            }else{ 
                branch = this.cohortTree[this.cohortIndex].branches;
            
            }

            let promis = this.selectedCohort.promis;
            let cpt = this.selectedCohort.cpt;
            let filterArray = this.selectedCohort.filterArray;
         
            let bcpt = JSON.parse(JSON.stringify(cpt));
            let bfilter = Object.assign([], this.cohortTree[this.cohortIndex].filterArray);
            let b = JSON.parse(JSON.stringify(promis));
      
            branch.push(b);
          
            let newSpot = branch.length - 1;
            let indexBranch =  this.cohortTree[this.cohortIndex].filterArray.length;
            this.cohortTree[this.cohortIndex].filterArray.push(['Branch', newSpot, indexBranch]);
            let branchFirst = [{parentEvents: bfilter, parentLink: [this.cohortIndex, b.length - 2]}];

            let treeBranch = new Cohort();

            treeBranch.label = "C-"+ String(this.cohortIndex + 1) + " Branch-" + String((this.cohortTree[this.cohortIndex].branches + 1));
            treeBranch.eventIndex = indexBranch;
            treeBranch.parentIndex = this.cohortIndex;
            treeBranch.filterArray = bfilter;
            treeBranch.promis = b;
            treeBranch.cpt = bcpt;

            this.cohortTree[this.cohortIndex].branches.push(treeBranch);
           
            events.fire('branch_selected', [this.cohortIndex, newSpot]);
         
            });

        events.on('branch_selected', (evt, item)=> {
    
            this.branchSelected = item;
            this.cohortIndex = item[0];
            let branchIndex = item[1];
            this.selectedCohort = this.cohortTree[this.cohortIndex].branches[branchIndex];
            events.fire('update_filters', [this.cohortTree, this.branchSelected]);
            events.fire('selected_cohort_change', this.selectedCohort);
            events.fire('update_chart', this.selectedCohort);
            events.fire('send_filter_to_codebar', this.cohortTree[this.cohortIndex].branches[branchIndex].filterArray);
            events.fire('test', [this.cohortTree, this.branchSelected]);
            });

        events.on('change_promis_scale', ()=> {
            let scaleRelative;

            if(this.branchSelected == null){
                scaleRelative = this.cohortTree[this.cohortIndex].scaleR;
                this.selectedCohort = this.cohortTree[this.cohortIndex];
            }else{
                scaleRelative = this.cohortTree[this.branchSelected[0]].branches[this.branchSelected[1]].scaleR;
                this.selectedCohort = this.cohortTree[this.branchSelected[0]].branches[this.branchSelected[1]];
            }

            if(!scaleRelative){
                scaleRelative = true;
                
            }else{
                scaleRelative = false;
            }
            this.selectedCohort.scaleR = scaleRelative;
            events.fire('update_chart', this.selectedCohort);
           
        });

        events.on('clear_cohorts', () => {
            this.removeCohortFilterArray();
            events.fire('clear_charts', null);
            });

         events.on('cpt_filter_button', (evt, item)=> {

            let fixed = item[0];
            let cptFilterArray = item[1];
             
            events.fire('filter_by_cpt', [fixed, cptFilterArray, this.selectedCohort]);

         });
            // events.fire('filter_by_cpt', [fixed, cptFilterArray]);
        
            //this comes directly from cohrot tree in eventline;
        events.on('cohort_selected', (evt, item)=>{
          console.log(item);
            let cohort = item[0];
            let index = item[1];
            this.cohortIndex = index;

            console.log(cohort);

            this.cohortTree[this.cohortIndex].promis = item[0].promis;
            this.selectedCohort = this.cohortTree[this.cohortIndex];
           
            let selectedLabel = document.getElementById('cohortKeeper').getElementsByClassName(index);
            this.branchSelected = null;

            events.fire('update_chart', this.selectedCohort);
           
            events.fire('send_filter_to_codebar', this.cohortTree[this.cohortIndex].filterArray);
         
            events.fire('test', [this.cohortTree, [index]]);
          });

          events.on('compare_button_down', ()=> {
    
                if(!this.comparisonBool){
                    this.comparisonBool = true;
                    events.fire('enter_comparison_view');
                }else{
                    this.comparisonBool = false;
                    events.fire('exit_comparison_view');
                }
            });

//fired in sidebar. send the filter information to refine the sidebar
        events.on('demo_refine', (evt, item)=> {
     
            let filters = item;
            if(this.branchSelected == null){
                events.fire('get_selected_demo', [filters, this.cohortTree[this.cohortIndex]]);
            }else{
                let index = this.branchSelected[0];
                let branchIndex = this.branchSelected[1];
                events.fire('get_selected_demo', [filters, this.cohortTree[index].branches[branchIndex]]);
            }

          });

        events.on('event_selected', (evt, item)=> {
            let codes = item;
            events.fire('update_cohort_start', [codes, this.selectedCohort]);
        });

        events.on('layer_button_down', (evt, item)=> {
           
            if(!this.layerBool){
                this.layerBool = true;
                events.fire('enter_layer_view');
            }else{
                this.layerBool = false;
                events.fire('exit_layer_view');
            }
        });

        events.on('separated_by_quant', (evt, item)=> {
           // this.seperatedCohortArray = item;
            if(this.branchSelected == null){
                this.cohortTree[this.cohortIndex].promisSep = item;
                this.cohortTree[this.cohortIndex].separated = true;
                this.selectedCohort = this.cohortTree[this.cohortIndex];
            }else{
                this.cohortTree[this.branchSelected[0]].branches[this.branchSelected[1]].promisSep = item;
                this.cohortTree[this.branchSelected[0]].branches[this.branchSelected[1]].separated = true;
                this.selectedCohort = this.cohortTree[this.branchSelected[0]].branches[this.branchSelected[1]];
            }
         
           events.fire('update_chart', this.selectedCohort);
          });

        events.on('selected_promis_filtered', (evt, item)=>{//fired in data manager
                
            if(this.branchSelected == null){
                this.cohortTree[this.cohortIndex].promis = item;
                this.selectedCohort = this.cohortTree[this.cohortIndex];
            }else{
                let index = this.branchSelected[0];
                let indexBranch = this.branchSelected[1];
                this.cohortTree[index].branches[indexBranch].promis = item;
                this.selectedCohort = this.cohortTree[index].branches[indexBranch];
                }

                events.fire('update_chart', this.selectedCohort);
            });

        events.on('frequency', ()=> { events.fire('frequency_test', this.selectedCohort)});

        events.on('new_cohort', (evt, item)=> {

            let promis = item[0];

            let filterReq = ['demographic', item[2], item[0].length];

            let newParent = new Cohort();

            newParent.label = 'Cohort-' + String((this.cohortTree.length + 1));
            newParent.eventIndex = 0;
            newParent.cpt = item[1];
            newParent.promis = promis;

            newParent.filterArray.push(filterReq);
            this.cohortTree.push(newParent);
            this.selectedCohort = this.cohortTree[this.cohortIndex];
          
            this.branchSelected = null;
            this.cohortIndex = this.cohortTree.length - 1;
            this.selectedCohort = this.cohortTree[this.cohortIndex];

            events.fire('update_chart', this.selectedCohort);
            events.fire('send_filter_to_codebar', this.cohortTree[this.cohortIndex].filterArray);
            events.fire('test', [this.cohortTree, [this.cohortIndex]]);
            
          
        });

        events.on('promis_from_demo_refiltered', (evt, item)=> {

            let filters = item[0];
            let promis = item[1];
            let cpt = item[2];

            let filterReq = ['demographic', filters, item[1].length];

            if(this.branchSelected == null){
                this.cohortTree[this.cohortIndex].promis = promis;
                this.cohortTree[this.cohortIndex].cpt = cpt;
                this.cohortTree[this.cohortIndex].filterArray.push(filterReq);
                this.selectedCohort = this.cohortTree[this.cohortIndex];

            }else{
                this.cohortTree[this.cohortIndex].branches[this.branchSelected[1]].promis = promis;
                this.cohortTree[this.cohortIndex].branches[this.branchSelected[1]].cpt = cpt;
                this.cohortTree[this.cohortIndex].branches[this.branchSelected[1]].filterArray.push(filterReq);
                this.selectedCohort = this.cohortTree[this.cohortIndex].branches[this.branchSelected[1]];
            }
           
            events.fire('update_chart', this.selectedCohort);
            events.fire('send_filter_to_codebar', this.selectedCohort.filterArray);

          });


        events.on('show_distributions', ()=> {
              events.fire('cohort_stat_array', this.cohortTree);
          });

      
        events.on('filter_cohort_by_event', (evt, item)=> {

              let cptfil = ['CPT', item[2], item[1].length];

              if(this.branchSelected == null){

                    this.cohortTree[this.cohortIndex].filterArray.push(cptfil);
                    this.cohortTree[this.cohortIndex].cpt = item[0];
                    this.cohortTree[this.cohortIndex].promis = item[1];
                    this.cohortTree[this.cohortIndex].separated = false;
                    this.cohortTree[this.cohortIndex].clumped = false;
                    this.selectedCohort = this.cohortTree[this.cohortIndex];

                    events.fire('send_filter_to_codebar', this.cohortTree[this.cohortIndex].filterArray);
                    events.fire('test', [this.cohortTree, [this.cohortIndex]]);
                 
              }else{
                  let index = this.branchSelected[0];
                  let branchIndex = this.branchSelected[1];
                  this.cohortTree[index].branches[branchIndex].filterArray.push(cptfil);
                  this.cohortTree[index].branches[branchIndex].cpt = item[0];
                  this.cohortTree[index].branches[branchIndex].promis = item[1];
                  this.selectedCohort = this.cohortTree[index].branches[branchIndex];

                  events.fire('send_filter_to_codebar',this.cohortTree[this.cohortIndex].branches[branchIndex].filterArray);
                  events.fire('test', [this.cohortTree, this.branchSelected]);
                }

                events.fire('update_chart', this.selectedCohort);
             
          });

        events.on('filter_aggregate', (evt, item)=> {
            events.fire('filter_cohort_agg', [this.selectedCohort, item]);
          });

        events.on('separate_aggregate', (evt, item)=> {
    
            if(this.selectedCohort.separated){
                this.selectedCohort.separated = false;
                document.getElementById('quartile-btn').classList.remove('btn-warning');
                document.getElementById('checkDiv').classList.add('hidden');
                events.fire('update_chart', this.selectedCohort);

            }else{
               
                this.selectedCohort.separated = true;
                document.getElementById('quartile-btn').classList.add('btn-warning');
                document.getElementById('checkDiv').classList.remove('hidden');
                events.fire('separate_cohort_agg', this.selectedCohort);
            }
            });

        events.on('filtered_by_quant', (evt, item)=> {
            
            if(this.branchSelected == null){
                this.cohortTree[this.cohortIndex].quantile = item;
                this.cohortTree[this.cohortIndex].promis = item;
                this.selectedCohort = this.cohortTree[this.cohortIndex];
            }else{
                this.cohortTree[this.branchSelected[0]].branches[this.branchSelected[1]].quantile = item;
                this.cohortTree[this.branchSelected[0]].branches[this.branchSelected[1]].promis = item;
                this.selectedCohort = this.cohortTree[this.branchSelected[0]].branches[this.branchSelected[1]];
            }
            events.fire('update_chart', this.selectedCohort);
          });

        events.on('filtered_by_count', (evt, item)=>{
           // this.selectedCohort = item[0];
         
            if(this.branchSelected == null){
                this.cohortTree[this.cohortIndex].filterArray.push(['Score Count', item[1], item[0].length]);
                this.cohortTree[this.cohortIndex].promis = item[0];
                this.cohortTree[this.cohortIndex].separated = false;
                this.cohortTree[this.cohortIndex].clumped = false;
                this.selectedCohort = this.cohortTree[this.cohortIndex];
                events.fire('send_filter_to_codebar', this.cohortTree[this.cohortIndex].filterArray);
                events.fire('test', [this.cohortTree, [this.cohortIndex]]);
            }else{
                this.cohortTree[this.cohortIndex].branches[this.branchSelected[1]].filterArray.push(['Score Count', item[1], item[0].length]);
                this.cohortTree[this.cohortIndex].branches[this.branchSelected].promis = item[0];
                this.cohortTree[this.cohortIndex].branches[this.branchSelected].separated = false;
                this.cohortTree[this.cohortIndex].branches[this.branchSelected].clumped = false;
                this.selectedCohort = this.cohortTree[this.cohortIndex].branches[this.branchSelected[1]];
                events.fire('send_filter_to_codebar', this.cohortTree[this.cohortIndex].branches[this.branchSelected[1]].filterArray);
                events.fire('test', [this.cohortTree, this.branchSelected]);
            }

            events.fire('update_chart', this.selectedCohort);
          });

        events.on('filter_by_Promis_count', (evt, item)=> {
              events.fire('filtering_Promis_count', [this.selectedCohort, item]);
          });
        events.on('cohort_interpolated', (evt, item)=> {
    
            if(this.branchSelected == null){
                this.cohortTree[this.cohortIndex].promis = item;
                this.selectedCohort = this.cohortTree[this.cohortIndex];
            }else{
                this.cohortTree[this.cohortIndex].branches[this.branchSelected[1]].promis = item;
                this.selectedCohort = this.cohortTree[this.cohortIndex].branches[this.branchSelected[1]];
            }
        events.fire('update_chart', this.selectedCohort);
          });

        events.on('min_day_calculated', (evt, item)=> {

              console.log('min day calculated');
              console.log(item);
              let promis = item[0];
              let cpt = item[1];
              let codes = item[2];

            if(this.branchSelected == null){
                this.cohortTree[this.cohortIndex].promis = promis;
                this.cohortTree[this.cohortIndex].cpt = cpt;
                this.cohortTree[this.cohortIndex].startEvent = codes;
                this.selectedCohort = this.cohortTree[this.cohortIndex];
            }else{
                this.cohortTree[this.branchSelected[0]].branches[this.branchSelected[1]].promis = promis;
                this.cohortTree[this.branchSelected[0]].branches[this.branchSelected[1]].cpt = cpt;
                this.cohortTree[this.branchSelected[0]].branches[this.branchSelected[1]].startEvent = codes;
                this.selectedCohort = this.cohortTree[this.branchSelected[0]].branches[this.branchSelected[1]];
            }
            events.fire('update_chart', this.selectedCohort);
        });
        events.on('selected_line_array', (evt, item)=> {
            events.fire('selected_line_with_cpt', [item, this.selectedCohort.cpt]);
        });
        events.on('update_promis', (evt, item)=> {
            let promis = item;
            if(this.branchSelected == null){
                this.cohortTree[this.cohortIndex].promis = promis;
                this.selectedCohort = this.cohortTree[this.cohortIndex];
            }else{
                this.cohortTree[this.branchSelected[0]].branches[this.branchSelected[1]].promis = promis;
                this.selectedCohort = this.cohortTree[this.branchSelected[0]].branches[this.branchSelected[1]];
            }
        });
        events.on('cpt_updated', (evt, item)=> {

             if(this.branchSelected == null){
                this.cohortTree[this.cohortIndex].cpt = item;
            }else{
                this.cohortTree[this.cohortIndex].branches[this.branchSelected[1]].cpt = item;
            
            }
          });

          events.on('yBrush_reset', (evt, item)=> {
            events.fire('update_chart', this.selectedCohort);
          });

    }

    //adds a cohort filter to the cohort filter array for the cohorts
    //this is going to set the index because it fires first 
    private addCohortFilter (filter) {
      
        this.cohortTree[this.cohortIndex].filterArray.push(filter);
     
        events.fire('cohort_added', this.cohortTree);
    }

    private removeCohortFilterArray () {

        this.cohortTree = [];
        this.cohortIndex = 0;

    }


  }

  export function create() {
    return new CohortManager();
}
