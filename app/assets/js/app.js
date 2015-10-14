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
  $('input[type=number]').each(function () {
    $(this).attr("step", "any");
  });
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
    console.log($(this).attr("table"), $(this).attr("data-id"));
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
            + "<div class='row'>"
            + "<div class='four columns'>"
            + "<label>Content Type</label>"
            + "<input class='u-full-width' type='text' name='"+table+"_contentType'/>"
            + "</div>"
            + "<div class='eight columns'>"
            + "<label>URL</label>"
            + "<input class='u-full-width' type='url' name='"+table+"_url'/>"
            + "</div></div>"
            + "<div class='row'>"
            + "<div class='four columns'>"
            + "<label>Size</label>"
            + "<input class='u-full-width' type='number' name='"+table+"_size'/>"
            + "</div>"
            + "<div class='eight columns'>"
            + "<label>Preview Image</label>"
            + "<input class='u-full-width' type='text' name='"+table+"_previewImage'/>"
            + "</div></div>";
  } else if(table === 'transform'){
    form = "<div class='form-container' id='"+target+"'>"
          + "<div class='row'>"
          + "<div class='two columns'>"
          +  "<label>Relative?</label>"
          +  "<input type='checkbox' name='"+table+"_rel'/>"
          + "</div>"
          + "<div class='ten columns'>"
          +  "<label>Angle</label>"
          +  "<input class='u-full-width' type='number' name='"+table+"_angle'/>"
          + "</div></div>"
          + "<div class='row'>"
          +  "<label>Rotation</label>"
          + "<div class='row'>"
          + "<div class='four columns'>"
          +  "<input class='u-full-width' type='number' name='"+table+"_rotate_x' placeholder='x'/>"
          + "</div><div class='four columns'>"
          +  "<input class='u-full-width' type='number' name='"+table+"_rotate_y' placeholder='y'/>"
          + "</div><div class='four columns'>"
          +  "<input class='u-full-width' type='number' name='"+table+"_rotate_z' placeholder='z'/>"
          + "</div></div></div>"

          +"<div class='row'>"
          + "<label>Translation</label>"
          +"<div class='row'>"
          + "<div class='four columns'>"
          +  "<input class='u-full-width' type='number' name='"+table+"_translate_x' placeholder='x'/>"
          + "</div><div class='four columns'>"
          +  "<input class='u-full-width' type='number' name='"+table+"_translate_y' placeholder='y'/>"
          + "</div><div class='four columns'>"
          +  "<input class='u-full-width' type='number' name='"+table+"_translate_z' placeholder='z'/>"
          + "</div></div></div>"

          +"<div class='row'>"
          +  "<label>Scale</label>"
          +"<div class='row'>"
          + "<div class='three columns'>"
          +  "<input class='u-full-width' type='number' name='"+table+"_scale_x' placeholder='x'/>"
          + "</div><div class='three columns'>"
          +  "<input class='u-full-width' type='number' name='"+table+"_scale_y' placeholder='y'/>"
          + "</div><div class='three columns'>"
          +  "<input class='u-full-width' type='number' name='"+table+"_scale_z' placeholder='z'/>"
          + "</div><div class='three columns'>"
          +  "<input class='u-full-width' type='number' name='"+table+"_scale' placeholder='uniform'/>"
          +  "</div></div></div>"
          +  "</div>";
  } else if(table === 'animation'){
    form = "<div class='form-container' id='"+target+"_"+formcount+"'>"
          + "<div class='row'>"
          + "<div class='three columns'>"
          + "<label>Event</label>"
          + "<select class='u-full-width' name='"+table+"_event_"+formcount+"'>"
          +  "<option value='onCreate'>onCreate</option>"
          +    "<option value='onUpdate'>onUpdate</option>"
          +    "<option value='onFocus'>onFocus</option>"
          +    "<option value='onClick'>onClick</option>"
          +    "<option value='onDelete'>onDelete</option>"
          +  "</select>"
          + "</div><div class='three columns'>"
          +  "<label>Type</label>"
          +  "<select class='u-full-width' name='"+table+"_type_"+formcount+"'>"
          +    "<option value='translate'>translate</option>"
          +    "<option value='rotate'>rotate</option>"
          +    "<option value='scale'>scale</option>"
          +  "</select>"
          + "</div><div class='three columns'>"
          +  "<label>Length</label>"
          +  "<input class='u-full-width' type='number' name='"+table+"_length_"+formcount+"'/>"
          + "</div><div class='three columns'>"
          +  "<label>Delay</label>"
          +  "<input class='u-full-width' type='number' name='"+table+"_delay_"+formcount+"'/>"
          + "</div></div>"

          + "<div class='row'>"
          + "<div class='three columns'>"
          +  "<label>Interpolation</label>"
          +  "<select class='u-full-width' name='"+table+"_interpolation_"+formcount+"'>"
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
          + "</div><div class='three columns'>"
          +  "<label>Interpolation Param</label>"
          +  "<input class='u-full-width' name='"+table+"_interpolationParam_"+formcount+"' type='number'/>"
          + "</div><div class='one column'>"
          +  "<label>Persist</label>"
          +  "<input name='"+table+"_persist_"+formcount+"' type='checkbox'/>"
          + "</div><div class='one column'>"
          +  "<label>Repeat</label>"
          +  "<input name='"+table+"_repeat_"+formcount+"' type='checkbox'/>"
          + "</div><div class='two columns'>"
          +  "<label>From</label>"
          +  "<input class='u-full-width' name='"+table+"_from_"+formcount+"' type='number'/>"
          + "</div><div class='two columns'>"
          +  "<label>To</label>"
          +  "<input class='u-full-width' name='"+table+"_to_"+formcount+"' type='number'/>"
          + "</div></div>"

          + "<div class='row'>"
          +  "<label>Axis</label>"
          + "<div class='row'>"
          + "<div class='four columns'>"
          +  "<input class='u-full-width' name='"+table+"_axis_x_"+formcount+"' type='number' placeholder='x'/>"
          + "</div><div class='four columns'>"
          +  "<input class='u-full-width' name='"+table+"_axis_y_"+formcount+"' type='number' placeholder='y'/>"
          + "</div><div class='four columns'>"
          +  "<input class='u-full-width' name='"+table+"_axis_z_"+formcount+"' type='number' placeholder='z'/>"
          +  "<input name='"+table+"_poiID_"+formcount+"' type='hidden'/>"
          + "</div></div></div>";
  } else if(table === 'action'){
    form = "<div class='form-container' id='"+target+"_"+formcount+"'>"

         + "<div class='row'>"
         + "<div class='four columns'>"
         +  "<label>URI</label>"
         + "<input class='u-full-width' name='"+table+"_uri_"+formcount+"' type='text'/>"
         + "</div><div class='four columns'>"
         +  "<label>Label</label>"
         + "<input class='u-full-width' name='"+table+"_label_"+formcount+"' type='text'/>"
         + "</div><div class='four columns'>"
         +  "<label>Content Type</label>"
         + "<input class='u-full-width' name='"+table+"_contentType_"+formcount+"' type='text'/>"
         + "</div></div>"

         + "<div class='row'>"
         + "<div class='four columns'>"
         +  "<label>Method</label>"
         + "<select class='u-full-width' name='"+table+"_method_"+formcount+"'>"
         + "<option value='GET'>GET</option>"
         + "<option value='POST'>POST</option>"
         + "</select>"
         + "</div><div class='four columns'>"
         +  "<label>Parameters</label>"
         + "<input class='u-full-width' name='"+table+"_params_"+formcount+"' type='text'/>"
         + "</div><div class='four columns'>"
         +  "<label>Activity Type</label>"
         + "<input class='u-full-width' name='"+table+"_activityType_"+formcount+"' type='number'/>"
         + "</div></div>"

         + "<div class='row'>"
         + "<div class='one column'>"
         +  "<label>Show Activity?</label>"
         + "<input name='"+table+"_showActivity_"+formcount+"' type='checkbox'/>"
         + "</div><div class='two columns'>"
         +  "<label>Auto Trigger Only?</label>"
         + "<input name='"+table+"_autoTriggerOnly_"+formcount+"' type='checkbox'/>"
         + "</div><div class='eight columns'>"
         +  "<label>Activity Message</label>"
         + "<input class='u-full-width' name='"+table+"_activityMessage_"+formcount+"' type='text'/>"
         + "</div><div class='one column'>"
         +  "<label>Auto Trigger</label>"
         + "<input name='"+table+"_autoTrigger_"+formcount+"' type='checkbox'/>"
         + "<input name='"+table+"_poiID_"+formcount+"' type='hidden'/>"

         + "</div></div></div>";
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
