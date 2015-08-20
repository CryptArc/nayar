/*
 * nayar/app/assets/js/app.js
 * https://github.com/thomasrstorey/nayar
 *
 * Copyright (c) 2015 thomasrstorey
 * Licensed under the MIT license.
 */

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

function deleteRow(table, id){
  $.ajax("/"+table+"/"+id, {method: 'DELETE'}).done(function(){

  }).fail(function(){

  }).always(function(){
    document.location.reload();
  });
};
