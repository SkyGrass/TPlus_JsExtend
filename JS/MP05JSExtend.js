var html =
    "<div>" +
    "<div class='row'>" +
    "<span class='lable'>产品:</span><select class='cont' id='product'><option value='-1'>--请选择--</option></select>" +
    "</div>" +
    "<div class='row'>" +
    "<lable class='lable'>产品编码:</lable><input id='code' type='text' value='' class='cont' readonly/>" +
    "</div>" +
    "<div class='row'>" +
    "<lable class='lable'>产品名称:</lable><input id='name' type='text' value='' class='cont' readonly/>" +
    "</div>" +
    "<div class='row'>" +
    "<lable class='lable'>规格型号:</lable><input id='specification' type='text' value='' class='cont' readonly/>" +
    "</div>" +
    "<div class='row'>" +
    "<lable class='lable'>项目:</lable><input id='project' type='text' value='' class='cont' readonly/>" +
    "</div>" +
    "<div class='row'>" +
    "<lable class='lable'>生产数量:</lable><input id='quantity' type='text' value='' class='cont' readonly/>" +
    "</div>" +
    "<div class='row'>" +
    "<lable class='lable'>客户:</lable><input id='customer' type='text' value='' class='cont' readonly/>" +
    "</div>" +
    "<div class='row'>" +
    "<lable class='lable'>打印数量:</lable><input min='1' id='printNum' type='number' value='1' class='cont'/>" +
    "</div>" +
    "<div class='row'>" +
    "<lable class='lable'>打印份数:</lable><input min='1' id='copyNum' type='number' value='1' class='cont'/>" +
    "</div>" +
    "<div class='row'>" +
    "<lable class='lable'>打印模板:</lable><select id='template' class='cont'><option value='-1'>--请选择--</option></select>" +
    "</div>" +
    "<div class='actionGroup'>" +
    "<input id='design' class='btn' disabled type='button' value='设计模板'/>" +
    "<input id='preview' class='btn' disabled type='button' value='预览'/>" +
    "<input id='print' class='btn' disabled type='button' value='打印'/>" +
    "</div>" +
    "<div style='border-bottom: 1px solid #F0F0F0;'><p id='state' class='state'>通讯连接中...</p></div>" +
    "</div>"

Ufida.T.MP.Client.ManufactureOrder.fn.extend({
    BarcodePrint: function(e) {
        var formData = {
            FType: 0,
            FEntryID: -1,
            FClientID: -1,
            FRptID: -1,
            FPrintQty: 0,
            FCopies: 0,
        };
        var rows = window.materialDetailController.productGrid.GetDataTable().Rows.map(function(r) {
            return $.extend({}, r.Inventory, { Quantity: r.Quantity }, { ID: r.ID }, { _Code: r.Code, _No: Number(r.Code) + 1 });
        });
        var socket = undefined;
        var timer = undefined;
        if (rows && rows.length > 0) {
            layer.open({
                type: 1,
                title: '条码打印',
                area: ['600px', '470px'],
                content: '<div id="cc">' + html + '</div>',
                success: function() {
                    initProductSelect(rows);

                    var first = rows[0]
                    $("#product").val(first.ID)
                    formData.FEntryID = first.ID;

                    fullForm(first);
                    getTemplates(first, initTemplateSelect);

                    $('#design').on('click', function() {
                        if (socket && socket.readyState == "1") {
                            socket.send(JSON.stringify($.extend({}, formData, { FType: 1 })))
                        } else {
                            layer.alert('通讯服务尚未连接,禁止设计模板', { icon: 5 });
                        }
                    });

                    $('#preview').on('click', function() {
                        if (socket && socket.readyState == "1") {
                            formData.FPrintQty = $("#printNum").val();
                            formData.FCopies = $("#copyNum").val();
                            socket.send(JSON.stringify($.extend({}, formData, { FType: 2 })))
                        } else {
                            layer.alert('通讯服务尚未连接,禁止预览', { icon: 5 });
                        }
                    });

                    $('#print').on('click', function() {
                        if (socket && socket.readyState == "1") {
                            layer.confirm('确定要打印吗?', function(index) {

                                formData.FPrintQty = $("#printNum").val();
                                formData.FCopies = $("#copyNum").val();

                                socket.send(JSON.stringify($.extend({}, formData, { FType: 3 })))
                                layer.close(index);
                            });
                        } else {
                            layer.alert('通讯服务尚未连接,禁止打印', { icon: 5 });
                        }
                    });

                    try {
                        if (WebSocket) {
                            socket = new WebSocket('ws://localhost:8181/');
                            socket.addEventListener('open', function() {
                                console.log('server is open');
                                $('#state').css('color', 'green')
                                $('#state').html("通讯服务已连接")
                                timer = setInterval(function() { socket.send(JSON.stringify($.extend({}, { FType: 0, FTime: new Date() * 1 }))) }, 3000)
                            });
                            socket.addEventListener('message', function(e) {
                                var data = e.data;
                                if (data) {
                                    console.log(data)
                                }
                            });
                            socket.addEventListener('close', function(e) {
                                $('#state').css('color', 'red')
                                $('#state').html("通讯服务已关闭")
                                console.log('close' + e);
                                if (timer) { clearInterval(timer); }
                            });
                            socket.addEventListener('error', function(e) {
                                $('#state').css('color', 'red')
                                $('#state').html("连接通讯服务发生错误")
                                console.log('error' + e);
                                if (timer) { clearInterval(timer); }
                            });
                        }
                    } catch (e) {
                        layer.alert('通讯服务发生异常!', { icon: 5 });
                    }
                },
                cancel: function(index) {
                    if (timer) { clearInterval(timer); }
                    socket.close();
                    layer.close(index)
                },
            });
        } else {
            layer.alert('当前单据尚未保存', { icon: 5 });
        }

        /*define*/
        function initProductSelect(data) {
            data.forEach(function(row) {
                $('#product').append("<option value='" + row.ID + "'>" + row._No + "||" + row._Code + "||" + row.Name + "</option>")
            })
            $('#product').on('change', function(e) {
                var Id = $(this).val();
                if (Id != undefined && Id != '-1') {
                    var cur = rows.filter(function(f) { return f.ID == Id });
                    if (cur && cur.length > 0) {
                        cur = cur[0]
                        fullForm(cur);
                        formData.FEntryID = cur.ID;
                        getTemplates(cur, initTemplateSelect);
                    } else {
                        clearForm();
                    }
                } else {
                    clearForm();
                    formData.FEntryID = -1;
                }
            });
        }

        function initTemplateSelect(data) {
            data.forEach(function(row) {
                $('#template').append("<option data-fname ='" + row.FClientName + "'  data-fkey='" + row.FClientID + "' value='" + row.FID + "'>" + row.FTitle + "</option>")
            })

            var first = data[0]
            $("#template").val(first.FID)
            $("#customer").val(first.FClientName)

            $('#design').removeAttr('disabled')
            $('#preview').removeAttr('disabled');
            $('#print').removeAttr('disabled');

            formData.FClientID = first.FClientID;
            formData.FRptID = first.FID;

            $('#template').on('change', function(e) {
                var Id = $(this).val();
                if (Id != undefined && Id != '-1') {
                    var target = $("#template").find("option:selected");
                    formData.FRptID = Id;
                    formData.FClientID = $(target).data('fkey');
                    $("#customer").val($(target).data('fname'));

                    $('#design').removeAttr('disabled')
                    $('#preview').removeAttr('disabled');
                    $('#print').removeAttr('disabled');
                } else {
                    formData.FRptID = -1;
                    formData.FClientID = -1;
                    $("#customer").val('');

                    $('#design').attr('disabled', 'disabled')
                    $('#preview').attr('disabled', 'disabled')
                    $('#print').attr('disabled', 'disabled')
                }
            })
        }

        function fullForm(cur) {
            $("#code").val(cur['Code']);
            $("#name").val(cur['Name']);
            $("#specification").val(cur['Specification']);
            $("#project").val(cur['Specification']);
            $("#quantity").val(cur['Quantity']);
            $("#printNum").val(1);
            $("#copyNum").val(1);
        }

        function clearForm() {
            $("#code").val('');
            $("#name").val('');
            $("#specification").val('');
            $("#project").val('');
            $("#quantity").val('');
            $("#customer").val('');
            $("#printNum").val(1);
            $("#copyNum").val(1);

            $('#preview').attr('disabled', 'disabled')
            $('#print').attr('disabled', 'disabled')
        }

        function getTemplates(row, success) {
            var formdata = new FormData();
            formdata.append("MethodName", "GetClientReport2");
            formdata.append("JSON", JSON.stringify({ Filter: row.ID }));


            $('#design').attr('disabled', 'disabled')
            $('#preview').attr('disabled', 'disabled')
            $('#print').attr('disabled', 'disabled')
            $.ajax({
                type: 'POST',
                url: 'http://139.196.254.33:8089/TPlusAPI.ashx',
                data: formdata,
                contentType: false,
                processData: false,
                success: function(res) {
                    $('#template').empty();
                    $('#template').append("<option value='-1'>--请选择--</option>")
                    try {
                        res = JSON.parse(res)
                        if (res.Result == "Y") {
                            success && success(res.Data)
                        } else {
                            layer.alert(res.Message, { icon: 5 });
                        }
                    } catch (e) {
                        layer.alert('查询客户模板发生错误!', { icon: 5 });
                    }
                },
                error: function(error) {
                    $('#template').empty();
                    layer.alert('当前单据尚未保存', { icon: 5 });
                }
            });
        }
    }
});