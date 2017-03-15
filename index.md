.onoffswitch {
    position: relative; width: 100px;
    -webkit-user-select:none; -moz-user-select:none; -ms-user-select: none;
}
.onoffswitch-checkbox {
    display: none;
}
.onoffswitch-label {
    display: block; overflow: hidden; cursor: pointer;
    border: 2px solid #999999; border-radius: 20px;
}
.onoffswitch-inner {
    display: block; width: 200%; margin-left: -100%;
    transition: margin 0.3s ease-in 0s;
}
.onoffswitch-inner:before, .onoffswitch-inner:after {
    display: block; float: left; width: 50%; height: 30px; padding: 0; line-height: 30px;
    font-size: 20px; color: white; font-family: Trebuchet, Arial, sans-serif; font-weight: bold;
    box-sizing: border-box;
}
.onoffswitch-inner:before {
    content: "ON";
    padding-left: 10px;
    background-color: #F74551; color: #FFFFFF;
}
.onoffswitch-inner:after {
    content: "OFF";
    padding-right: 10px;
    background-color: #FFFFFF; color: #999999;
    text-align: right;
}
.onoffswitch-switch {
    display: block; width: 20px; margin: 5px;
    background: #FFFFFF;
    position: absolute; top: 0; bottom: 0;
    right: 66px;
    border: 2px solid #999999; border-radius: 20px;
    transition: all 0.3s ease-in 0s; 
}
.onoffswitch-checkbox:checked + .onoffswitch-label .onoffswitch-inner {
    margin-left: 0;
}
.onoffswitch-checkbox:checked + .onoffswitch-label .onoffswitch-switch {
    right: 0px; 
}


<html>
<head>

  <link rel="stylesheet" type="text/css" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.4/css/bootstrap.min.css">
  <link rel="stylesheet" type="text/css" href="style.css">
  <script type="text/javascript" src="https://code.jquery.com/jquery-2.1.4.min.js"></script>
  <script type="text/javascript" src="https://cdn.rawgit.com/Foliotek/AjaxQ/master/ajaxq.js"></script>
  <script type="text/javascript" src="https://cdn.rawgit.com/marcoschwartz/aREST.js/master/aREST.js"></script>
  <script type="text/javascript" src="script.js"></script>
  
</head>
<body>
<div class='container'>
 <h1>Relay Control - On/Off for Boiler</h1>
 <div class='row'>
   <div class="col-md-1"></div>
   <div class="col-md-2">
     <button id='on' class='btn btn-block btn-success'>On</button>
   </div>
  <div class="col-md-2">
    <button id='off' class='btn btn-block btn-danger'>Off</button>
  </div>
 </div>
</div>

<div class="onoffswitch">
    <input type="checkbox" name="onoffswitch" class="onoffswitch-checkbox" id="myonoffswitch">
    <label class="onoffswitch-label" for="myonoffswitch">
        <span class="onoffswitch-inner"></span>
        <span class="onoffswitch-switch"></span>
    </label>
</div>

</body>
</html>
