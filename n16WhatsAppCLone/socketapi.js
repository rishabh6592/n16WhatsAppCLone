const user = require("./Model/user");
const messageModel = require('./Model/message')

const io = require("socket.io")();
const socketapi = {
    io: io
};

// Add your socket.io logic here!
io.on("connection", function (socket) {
    console.log("A user connected");


    socket.on('join-server', async userDetails => {
        // console.log(userDetails)

        await user.findOneAndUpdate({
            username: userDetails.username
        }, {
            socketId: socket.id
        })

        const onlineUsers = await user.find({
            socketId: {
                $nin: [ "", socket.id ]
            }
        })

        onlineUsers.forEach(onlineUser => {
            socket.emit('new-user-join', {
                profileImage: onlineUser.profileImage,
                username: onlineUser.username,
            })
        })

        console.log(onlineUsers)


        socket.broadcast.emit('new-user-join', userDetails)
    })

    socket.on('disconnect', async () => {

        await user.findOneAndUpdate({
            socketId: socket.id
        }, {
            socketId: ""
        })

    })

    socket.on('private-message', async messageObject => {

        await messageModel.create({
            msg: messageObject.message,
            sender: messageObject.sender,
            receiver: messageObject.receiver,
        })

        const receiver = await user.findOne({
            username: messageObject.receiver
        })

        socket.to(receiver.socketId).emit('receive-private-message', messageObject)
    })


    socket.on("fetch-conversation", async conversationDetails => {

        const allMessages = await messageModel.find({
            $or: [
                {
                    sender: conversationDetails.sender /* a */,
                    receiver: conversationDetails.receiver /* b */,
                },
                {
                    receiver: conversationDetails.sender /* a */,
                    sender: conversationDetails.receiver /* b */,
                }
            ]
        })

        socket.emit('send-conversation', allMessages)

    })


});
// end of socket.io logic

module.exports = socketapi;