/*global define */
define(['queue', 'splitiscope'], function (queue, splitiscope) {
    'use strict';

    function errorMsg(msg) {
        console.error(msg);
    }

    var Application = {
        initialize: function(){
            queue()
                .defer(d3.json,'http://glados1.systemsbiology.net:3335/svc/data/analysis/rf-leaves/layouts/2013_02_21_ms_ITMI_DF3b_no_NPF_M_FM_3_hilevel.fm_NB_TermCategory_pred_17_12800_10000_1000_4/fiedler/2013_02_21_ms_ITMI_DF3b_no_NPF_M_FM_3_hilevel.fm_NB_TermCategory_pred_17_12800_10000_1000_4.cutoff.0.0.json')
                .await(function(error, data1, data2){
                    if (error) { errorMsg(error);}
                    console.log(data1);
                    console.log(data2);

                });
        }
    };
    return Application;
});