function doSomething(){

    const formData = JSON.parse(localStorage.getItem("formData"));
    for(const property in formData){
        console.log(`${property}`)
        var element = document.querySelector(`[name = "${property}"]`)
        element.value = `${formData[property]}`
    }
    localStorage.removeItem("formData")
}

