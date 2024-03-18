class MatchController {
    private static instance: MatchController;

    private constructor() {};

    public static getInstance(): MatchController{
        if (MatchController.instance) MatchController.instance = new MatchController();
        return MatchController.instance;
    }

}