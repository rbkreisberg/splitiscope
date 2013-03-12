/*global define */
define(['queue', 'splitiscope'], function (queue, split_vis) {
    'use strict';

    function errorMsg(msg) {
        console.error(msg);
    }

    var x_range = { min : 0, max : 8},
        y_range = { min :-4, max : 4},
        splits_range = { min : 20, max : 200},
        label_list = ['high', 'low'],
        test_data = {};

    test_data.x = _.map(_.range(100),function(value) {
                return Math.round(Math.random()*(x_range.max - x_range.min) + x_range.min);
    });

    test_data.y = _.map(_.range(100),function(value) {
                return (Math.random()*(y_range.max - y_range.min) + y_range.min);
    });

   test_data.label = _.map(_.range(100),function(value) {
                return label_list[Math.round(Math.random() * (label_list.length-1))];
    });

   test_data.splits_on_x = _.map(_.range(100),function(value) {
                return Math.round(Math.random()*(splits_range.max - splits_range.min) + splits_range.min);
    });

    var test_split = {

                bins: _.map(_.range(1,9), function(value) {
                   return Math.pow(value+1,-1*Math.abs((value-5)/10))* 100;
                }),
                low: x_range.min + 1,
                binsize: ((x_range.max -1) - (x_range.min +1)) / 10
    };

    var Application = {
        initialize: function(){
            // queue()
            //     //.defer(d3.json,'http://glados1.systemsbiology.net:3335/svc/data/analysis/rf-leaves/layouts/2013_02_21_ms_ITMI_DF3b_no_NPF_M_FM_3_hilevel.fm_NB_TermCategory_pred_17_12800_10000_1000_4/fiedler/2013_02_21_ms_ITMI_DF3b_no_NPF_M_FM_3_hilevel.fm_NB_TermCategory_pred_17_12800_10000_1000_4.cutoff.0.0.json')
            //     .defer(function() { return true;})
            //     .await(function(error, data1){
            //         if (error) { errorMsg(error);}
                    var splitiscope = split_vis({
                        radius: 12,
                        margin : {
                                    top: 10, left: 10, bottom: 30, right: 30
                        }

                    });
                    splitiscope('#plot').data(test_data).splits(test_split).render();
                // });
        }
    };
    return Application;
});