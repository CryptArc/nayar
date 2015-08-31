/*
 * nayar/app/assets/js/app.js
 * https://github.com/thomasrstorey/nayar
 *
 * Copyright (c) 2015 thomasrstorey
 * Licensed under the MIT license.
 */

// Need to stop using "onclick" properties
// assign click functions by class, use id for customization

$(document).ready(function(){

  $(".add").click(function(event){
    var addobj = {};
    addobj.table = $(this).attr("add");
    if($(this).attr("poi-id")){
      addobj.poiID = $(this).attr("poi-id");
    } else if($(this).attr("layer-id")){
      addobj.layerID = $(this).attr("layer-id");
    }
    console.log(addobj.table, addobj.poiID);
    event.preventDefault();
    addNew(addobj);
  });

  $(".form-toggle").click(function(event){
    toggleForm($(this).attr("form"), $(this).attr("table"));
  });

  $(".save-new").click(function(event){
    formSubmit('new');
  });

  $(".save-button").click(function(event){
    formSubmit('update');
  });

  $(".data-link").click(function(event){
    goTo({table: $(this).attr("table"), id:$(this).attr("data-id")});
  });

  $(".delete-row").click(function(event){
    deleteRow({table: $(this).attr("table"), id:$(this).attr("data-id")});
  });

  $("#select-poitype").change(function(event){
    $("#geo-poi-params-container").slideToggle();
    $("#vision-poi-params-container").slideToggle();
  });

  if($("#select-poitype").val() === 'geo'){
     $("#geo-poi-params-container").css({display: 'block'});
     $("#vision-poi-params-container").css({display: 'none'});
  } else if($("#select-poitype").val() === 'vision'){
    $("#vision-poi-params-container").css({display: 'block'});
    $("#geo-poi-params-container").css({display: 'none'});
  }

});

function goTo(data){
  var location = "/"+data.table+"/"+data.id;
  document.location = location;
};

function addNew(data){
  var location = "/new/"+data.table+"/";
  if(data.poiID){
    location += "?poiID="+data.poiID;
  }else if(data.layerID){
    location += "?layerID="+data.layerID;
  }
  document.location = location;
};

function formSubmit(id){
  $("#"+id).submit();
};

function deleteRow(data){
  $.ajax("/"+data.table+"/"+data.id, {method: 'DELETE'}).done(function(){

  }).fail(function(){

  }).always(function(){
    document.location.reload();
  });
};

function toggleForm(target, table){
  var containerElement = $("#"+target+"-container");
  var formcount = containerElement.children().length;
  var form = "";
  if(table === 'object'){
    form =  "<div class='form-container' id='"+target+"'>"
            + "<label>Content Type</label>"
            + "<input type='text' name='"+table+"_contentType'/>"
            + "<label>URL</label>"
            + "<input type='url' name='"+table+"_url'/>"
            + "<label>Size</label>"
            + "<input type='number' name='"+table+"_size'/>"
            + "<label>Preview Image</label>"
            + "<input type='text' name='"+table+"_previewImage'/>"
            + "</div>";
  } else if(table === 'transform'){
    form = "<div class='form-container' id='"+target+"'>"
          +  "<label>Relative?</label>"
          +  "<input type='checkbox' name='"+table+"_rel'/>"
          +  "<label>Angle</label>"
          +  "<input type='number' name='"+table+"_angle'/>"
          +  "<label>Rotation</label>"
          +  "<input type='number' name='"+table+"_rotate_x' placeholder='x'/>"
          +  "<input type='number' name='"+table+"_rotate_y' placeholder='y'/>"
          +  "<input type='number' name='"+table+"_rotate_z' placeholder='z'/>"
          +  "<label>Translation</label>"
          +  "<input type='number' name='"+table+"_translate_x' placeholder='x'/>"
          +  "<input type='number' name='"+table+"_translate_y' placeholder='y'/>"
          +  "<input type='number' name='"+table+"_translate_z' placeholder='z'/>"
          +  "<label>Scale</label>"
          +  "<input type='number' name='"+table+"_scale_x' placeholder='x'/>"
          +  "<input type='number' name='"+table+"_scale_y' placeholder='y'/>"
          +  "<input type='number' name='"+table+"_scale_z' placeholder='z'/>"
          +  "<input type='number' name='"+table+"_scale' placeholder='uniform'/>"
          +  "</div>";
  } else if(table === 'animation'){
    form = "<div class='form-container' id='"+target+"_"+formcount+"'>"
          + "<label>Event</label>"
          + "<select name='"+table+"_event_"+formcount+"'>"
          +  "<option value='onCreate'>onCreate</option>"
          +    "<option value='onUpdate'>onUpdate</option>"
          +    "<option value='onFocus'>onFocus</option>"
          +    "<option value='onClick'>onClick</option>"
          +    "<option value='onDelete'>onDelete</option>"
          +  "</select>"
          +  "<label>Type</label>"
          +  "<select name='"+table+"_type_"+formcount+"'>"
          +    "<option value='translate'>translate</option>"
          +    "<option value='rotate'>rotate</option>"
          +    "<option value='scale'>scale</option>"
          +  "</select>"
          +  "<label>Length</label>"
          +  "<input type='number' name='"+table+"_length_"+formcount+"'/>"
          +  "<label>Delay</label>"
          +  "<input type='number' name='"+table+"_delay_"+formcount+"'/>"
          +  "<label>Interpolation</label>"
          +  "<select name='"+table+"_interpolation_"+formcount+"'>"
          +    "<option value='linear'>linear</option>"
          +    "<option value='accelerateDecelerate'>accelerateDecelerate</option>"
          +    "<option value='accelerate'>accelerate</option>"
          +    "<option value='decelerate'>decelerate</option>"
          +    "<option value='bounce'>bounce</option>"
          +    "<option value='cycle'>cycle</option>"
          +    "<option value='anticipateOvershoot'>anticipateOvershoot</option>"
          +    "<option value='anticipate'>anticipate</option>"
          +    "<option value='overshoot'>overshoot</option>"
          +  "</select>"
          +  "<label>Interpolation Param</label>"
          +  "<input name='"+table+"_interpolationParam_"+formcount+"' type='number'/>"
          +  "<label>Persist</label>"
          +  "<input name='"+table+"_persist_"+formcount+"' type='checkbox'/>"
          +  "<label>Repeat</label>"
          +  "<input name='"+table+"_repeat_"+formcount+"' type='checkbox'/>"
          +  "<label>From</label>"
          +  "<input name='"+table+"_from_"+formcount+"' type='number'/>"
          +  "<label>To</label>"
          +  "<input name='"+table+"_to_"+formcount+"' type='number'/>"
          +  "<label>Axis</label>"
          +  "<input name='"+table+"_axis_x_"+formcount+"' type='number' placeholder='x'/>"
          +  "<input name='"+table+"_axis_y_"+formcount+"' type='number' placeholder='y'/>"
          +  "<input name='"+table+"_axis_z_"+formcount+"' type='number' placeholder='z'/>"
          +  "<input name='"+table+"_poiID_"+formcount+"' type='hidden'/>"
          + "</div>";
  } else if(table === 'action'){
    form = "<div class='form-container' id='"+target+"_"+formcount+"'>"
         +  "<label>URI</label>"
         + "<input name='"+table+"_uri_"+formcount+"' type='text'/>"
         +  "<label>Label</label>"
         + "<input name='"+table+"_label_"+formcount+"' type='text'/>"
         +  "<label>Content Type</label>"
         + "<input name='"+table+"_contentType_"+formcount+"' type='text'/>"
         +  "<label>Method</label>"
         + "<select name='"+table+"_method_"+formcount+"'>"
         + "<option value='GET'>GET</option>"
         + "<option value='POST'>POST</option>"
         + "</select>"
         +  "<label>Parameters</label>"
         + "<input name='"+table+"_params_"+formcount+"' type='text'/>"
         +  "<label>Activity Type</label>"
         + "<input name='"+table+"_activityType_"+formcount+"' type='number'/>"
         +  "<label>Show Activity?</label>"
         + "<input name='"+table+"_showActivity_"+formcount+"' type='checkbox'/>"
         +  "<label>Auto Trigger Only?</label>"
         + "<input name='"+table+"_autoTriggerOnly_"+formcount+"' type='checkbox'/>"
         +  "<label>Activity Message</label>"
         + "<input name='"+table+"_activityMessage_"+formcount+"' type='text'/>"
         +  "<label>Auto Trigger</label>"
         + "<input name='"+table+"_autoTrigger_"+formcount+"' type='checkbox'/>"
         + "<input name='"+table+"_poiID_"+formcount+"' type='hidden'/>"
         + "</div>";
       }
    if(table === 'object' || table === 'transform'){
      if(formcount === 0){
        containerElement.append(form);
        $('#poi-'+table+'-form').slideToggle();
      }
    } else if(table === 'animation' || table === 'action') {
        if(formcount < 9){
          containerElement.append(form);
          $('#poi-'+table+'-form_'+formcount).slideToggle();
        }
    }
}

function slideTable(table) {
  $('#poi-'+table+'-form').slideToggle();
}
