function doCrap(){
    // var element = document.querySelector("[ name = 'Name' ]");
    // element.value = "Damn Son";
    // element = document.querySelector("[name = 'DOB']");
    // element.value = '2024-01-23';
    // element = document.querySelector("[name = 'Gender']")
    // element.value = 'Female';
    // element = document.querySelector("[name = 'Residence']")
    // element.value = 'Highly Hills'
    // element = document.querySelector("[name = 'Address']")
    // element.value = 'Park Street'
    // element = document.querySelector("[name = 'Region']")
    // element.value = 'Southern Plateus'
    // element = document.querySelector("[name = 'Country']")
    // element.value = 'Blud'
    // element = document.querySelector("[name = 'State']")
    // element.value = 'Banzai'
    // element = document.querySelector("[name = 'City']")
    // element.value = 'Dazai'
    // element = document.querySelector("[name = 'POSTAL']")
    // element.value = '455144'
    // element = document.querySelector("[name = 'PHONE']")
    // element.value = '4585541221'
    // element = document.querySelector("[name = 'Email']")
    // element.value = 'damnson@gmail.com'


}
function doSomething(){
    const formData = JSON.parse(localStorage.getItem("formData"));
    for(const property in formData){
        console.log(`${property}`)
        const element = document.querySelector(`[name = "${property}"]`)
        element.value = `${formData[property]}`
    }
}

