var WindowsManagerClass = Class.create();
WindowsManagerClass.prototype = {
	initialize: function(options){
		WindowsManager = this;
		this.open_windows = [];
		this.focus = false;
		this.next_window_id = 1;
	},
	
	request_focus: function(window_id){
		try{
			var requester = this.get_window(window_id);
			if(!requester)
				return;
			var new_array = this.open_windows.without(requester);
			new_array[new_array.length] = requester;
			this.open_windows = new_array;
		
			if(this.focus)
				this.focus.set_focus(false);
			requester.set_focus(true);
			this.focus = requester;
		}catch(err){
			alert("Error changing window focus: "+err);
		}
		
		this.relayer();
	},
	
	request_close: function(window_id){
		var requester = this.get_window(window_id);
		if(!requester)
			return;
		var new_array = this.open_windows.without(requester);
		this.open_windows = new_array;
		requester.destroy();
		
		if(this.open_windows.length>0){
			new_focus = this.open_windows[this.open_windows.length-1];
			this.request_focus(new_focus.id);
		}
	},
	
	register_new_window: function(window){
		window.id = this.next_window_id++;
		window.frame.writeAttribute("window_id",window.id);
		this.open_windows[this.open_windows.length] = window;	
		this.request_focus(window.id);
	},
	
	get_windows_by_position: function(x,y){
		x = parseInt(x);
		y = parseInt(y);
		return this.open_windows.select(function(value){
			var offsets = value.frame.cumulativeOffset();
			return Math.abs(offsets[0]-x)<10 && Math.abs(offsets[1]-y)<10;
		});
	},
	
	//private functions
	
	//goes through and resets the zindexs on all the windows
	relayer: function(){
		try{
			this.open_windows.each(function(window,index){
				window.setStyle({"z-index":(index+1)});
			});
		}catch(err){
			alert("Error relayer windows: "+err);
		}
		
	},
	
	get_window: function(window_id){
		return this.open_windows.detect(function(w){return w.id==window_id;});
	}
};
WindowsManager = new WindowsManagerClass();



var Window = Class.create();
Window.prototype = {
	initialize: function(settings){
		try{
			this.id = -1;
			this.settings = ($H({width:400, height:400, title:""}).merge($H(settings))).toObject();
			this.generate_frame();
			WindowsManager.register_new_window(this);	
			this.frame.show();
			if(settings["onOpen"])
				settings["onOpen"]();
		}
		catch(err){
			alert("Error creating window: "+err);
		}
	},
	
	set_focus:function(is_focused){
		if(is_focused){
			this.frame.addClassName("focused");
		}else{
			this.frame.removeClassName("focused");
		}
	},
	
	setStyle: function(settings){
		if(this.frame){
			on_frame = {};
			if(settings["width"])
				on_frame["width"]= settings["width"]=="auto" ? settings["width"] : parseInt(settings["width"])+"px";
			if(settings["height"])
				on_frame["height"]= settings["height"]=="auto" ? settings["height"] : parseInt(settings["height"])+"px";
			if(settings["left"])
				on_frame["left"]=parseInt(settings["left"])+"px";
			if(settings["top"])
				on_frame["top"]=parseInt(settings["top"])+"px";
			if(settings["right"])
				on_frame["right"]=parseInt(settings["right"])+"px";
			if(settings["bottom"])
				on_frame["bottom"]=parseInt(settings["bottom"])+"px";
			this.frame.setStyle(on_frame);
			if(settings["z-index"])
			{
				this.frame.up(".window-wrapper").style.zIndex=parseInt(settings["z-index"]);
				this.frame.style.zIndex=parseInt(settings["z-index"]);
			}
		}
	},
		
	destroy: function(){
		this.frame.remove();
	},
	
	toggle_maximize: function(){
		if(this.maximized){
			this.maximized = false;
			this.setStyle({width:this.old_width, height:this.old_height, left:this.old_offset[0], top:this.old_offset[1]});
			this.frame.removeClassName("maximized");
		}else{
			this.maximized = true;
			this.old_height = this.frame.getHeight();
			this.old_width = this.frame.getWidth();
			this.old_offset = this.frame.positionedOffset();
			vp_dimensions = document.viewport.getDimensions();
			new_width = vp_dimensions["width"]-2+"px";
			new_height = vp_dimensions["height"]-2+"px";
			this.setStyle({left:"0px", top:"0px", width:new_width, height:new_height});
			this.frame.addClassName("maximized");
		}
		
	},
	
	//private functions ----------------------
	
	generate_frame: function(){
		inner_content = "<div class='top-bar'>"+
							"<div class='wm_buttons'>"+
								"<a href='#' class='close wm_button' onclick='return false'><img src='images/wm/close.png' /></a>"+
							"</div>"+
							"<span class='title'>"+this.settings["title"]+"</span>"+
						"</div>"+
						"<div class='content-area'></div>"+
						"<div class='focus-cover'></div>";
		this.frame = new Element("div",{"style":"display:none"}).update(inner_content);
		this.frame.addClassName("window-frame");
		this.setStyle(this.settings);
		this.frame.down(".focus-cover").setOpacity(0.5);
		this.frame.down(".focus-cover").observe("mousedown",function(event){
				window_id = event.element().up(".window-frame").readAttribute("window_id");
				WindowsManager.request_focus(window_id);
			});
			
		this.frame.down(".close").observe("click",function(event){
				window_id = event.element().up(".window-frame").readAttribute("window_id");
				WindowsManager.request_close(window_id);
			});
		this.draggable = new Draggable(this.frame,{handle:"top-bar",
											onDrag:function(draggable){draggable.element.down(".content-area").hide();},
											onEnd:function(draggable){draggable.element.down(".content-area").show();}
									});
		
		this.make_resizeable();
		this.add_shadow();
		this.set_initial_position();
		var wrapper = new Element("div").update(this.frame);
		wrapper.addClassName("window-wrapper");
		Element.extend(document.body).insert(wrapper);
	},
	
	make_resizeable: function(){
		resizer = new Element("div");
		resizer.addClassName("resizer");
		this.frame.down(".content-area").insert({after:resizer});
		
		new Draggable(resizer,{onDrag:function(draggable){
				resizer = draggable.element;
				window_frame = resizer.up(".window-frame");
				window_frame.down(".content-area").hide();
				offset = resizer.positionedOffset();
				new_width = (offset[0]+resizer.getWidth())+"px";
				new_height = (offset[1]+resizer.getHeight())+"px";
				window_frame.setStyle({"width":new_width,"height":new_height});
				
				window_id = resizer.up(".window-frame").readAttribute("window_id");
				me = WindowsManager.get_window(window_id);
				me.maximized = false;
				window_frame.removeClassName("maximized");
			},
			onEnd:function(draggable){
				resizer = draggable.element;
				resizer.setStyle({right:"0px", bottom:"0px", "position":"absolute", top:"auto", left:"auto"});
				window_frame = resizer.up(".window-frame");
				window_frame.down(".content-area").show();
			}
		});
		resizer.setStyle({right:"0px", bottom:"0px", "position":"absolute", top:"auto", left:"auto"});
		
		max_button = new Element("a",{"class":"maximize wm_button",onclick:"return false",href:"#"}).update("<img src='images/wm/max.png' />");
		this.frame.down(".close").insert({after:max_button});
		max_button.observe("click",function(event){
			window_id = event.element().up(".window-frame").readAttribute("window_id");
			me = WindowsManager.get_window(window_id);
			me.toggle_maximize();
		});
	},
	
	set_initial_position: function(){
		vp_dimensions = document.viewport.getDimensions();
		new_left = (vp_dimensions["width"]*30/100);
		new_top = (vp_dimensions["height"]*20/100);
		while(WindowsManager.get_windows_by_position(new_left,new_top).length>0)
		{
			new_left+=20;
			new_top += 20;
		}
		this.frame.setStyle({left:new_left+"px", top:new_top+"px"});
	},
	
	add_shadow: function(){
		r = new Element("div");
		r.addClassName("shadow shadow-right");
		this.frame.insert(r);
		
		r = new Element("div");
		r.addClassName("shadow shadow-bottom");
		this.frame.insert(r);
		
		r = new Element("div");
		r.addClassName("shadow shadow-br");
		this.frame.insert(r);
		
		r = new Element("div");
		r.addClassName("shadow shadow-tr");
		this.frame.insert(r);
		
		r = new Element("div");
		r.addClassName("shadow shadow-bl");
		this.frame.insert(r);
	}
	
};