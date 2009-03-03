var HelloWorldWindow = Class.create(Window,{
	initialize: function($super,settings){
		$super(settings);
		this.frame.down('.content-area').update("<h1 style='margin:10px; font-size:20px'>Hello World!</h1>");
	}
});