var IFrameWindow = Class.create();
IFrameWindow.prototype = {
	initialize: function(settings){
		this.settings = settings;
		this.original_on_open = settings["onOpen"];
		this.window = new Window(settings);
		this.create_frame();
	},
	
	
	create_frame: function(){
		content_area = this.window.frame.down('.content-area');
		f = new Element("iframe",{src:this.settings["url"]});
		f.addClassName("iframe-window");
		content_area.update(f);
	}
	
};